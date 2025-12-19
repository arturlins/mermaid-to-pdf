import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { randomUUID } from 'crypto';
import chromium from '@sparticuz/chromium';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper to kill type errors with internal mermaid-cli types if strict
type MermaidOutput = `${string}.pdf` | `${string}.svg` | `${string}.png`;

export async function POST(req: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const code = formData.get('code') as string | null;

    let inputContent = '';
    let originalName = 'diagram';

    if (file) {
      inputContent = await file.text();
      // Sanitize filename: ASCII only, fallback to 'diagram' if empty
      const cleanName = file.name.replace(/\.(mmd|md)$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      originalName = cleanName || 'diagram';

      const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)\s*```/;
      const match = mermaidBlockRegex.exec(inputContent);
      if (match && match[1]) {
        inputContent = match[1].trim();
      }
    } else if (code) {
      inputContent = code;
    }

    // Debug inputs
    console.log(`Input received: File=${!!file}, CodeLength=${code?.length}`);

    if (!inputContent) {
      return NextResponse.json({ error: 'No Mermaid code provided' }, { status: 400 });
    }

    const id = randomUUID();
    const tempDir = os.tmpdir();
    const inputContentPath = join(tempDir, `${id}.mmd`);
    const outputPath = join(tempDir, `${id}.pdf`);
    const puppeteerConfigPath = join(tempDir, `${id}-puppeteer-config.json`);

    tempFiles.push(inputContentPath);
    tempFiles.push(outputPath);
    tempFiles.push(puppeteerConfigPath);

    let executablePath = '';

    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      executablePath = await chromium.executablePath();
    } else {
      const localPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ];
      executablePath = localPaths.find(path => existsSync(path)) || '';
    }

    // Fix Build Error: 'headless' property might not exist on chromium object in newer versions
    // Using simple boolean 'true' which is standard for puppeteer config
    const puppeteerConfig = {
      executablePath: executablePath,
      headless: true,
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=none'
      ],
      ignoreHTTPSErrors: true,
    };

    await writeFile(puppeteerConfigPath, JSON.stringify(puppeteerConfig));
    await writeFile(inputContentPath, inputContent);

    // 3. Execute mermaid-cli via CLI Script (User Requirement)
    // We use the CLI script directly because the Node 'run' API does not expose 'pdfFit' in its options,
    // and the user explicitly requires the '--pdfFit' argument behavior.
    console.log('Invoking mermaid-cli via CLI script...');

    const cliScriptPath = resolve(process.cwd(), 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'cli.js');

    if (!existsSync(cliScriptPath)) {
      throw new Error(`Could not locate mermaid-cli script at: ${cliScriptPath}`);
    }

    try {
      // Use execFile to run 'node cli.js ...args'
      // This avoids shell injection and effectively runs the command as requested.
      const childProcess = await import('child_process');
      const { execFile } = childProcess;
      const execFileAsync = promisify(execFile);

      const args = [
        cliScriptPath,
        '-i', inputContentPath,
        '-o', outputPath as string, // Explicit cast to string for CLI args
        '-p', puppeteerConfigPath,
        '--pdfFit'
      ];

      console.log(`Spawning: ${process.execPath} ${args.join(' ')}`);

      // Pass HOME env var to point to tempDir.
      // We do strictly what is needed for the environment.
      const env = {
        ...process.env,
        HOME: tempDir,
        PUPPETEER_CONFIG: puppeteerConfigPath
      };

      const { stdout, stderr } = await execFileAsync(process.execPath, args, { env });

      console.log('CLI stdout:', stdout);
      if (stderr) console.error('CLI stderr:', stderr);

    } catch (cliError: any) {
      console.error('Mermaid CLI Execution Error:', cliError);
      if (cliError.message?.includes('EACCES') || cliError.message?.includes('permission denied')) {
        throw new Error(`Permission denied executing CLI. Ensure permissions are correct.`);
      }
      throw new Error(`Conversion process failed: ${cliError.message}\nStderr: ${cliError.stderr || ''}`);
    }

    if (!existsSync(outputPath)) {
      // Sometimes run() might fail silently or output elsewhere?
      // Check for errors.
      throw new Error("PDF file was not created by the converter.");
    }

    const fileStat = await stat(outputPath);
    if (fileStat.size === 0) {
      throw new Error("PDF file was created but is empty (0 bytes).");
    }
    console.log(`PDF generated successfully. Size: ${fileStat.size} bytes`);

    const pdfBuffer = await readFile(outputPath);
    console.log(`PDF successfully read into buffer. Buffer size: ${pdfBuffer.length}`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    await Promise.allSettled(
      tempFiles.map((file) => unlink(file).catch(() => { }))
    );
  }
}
