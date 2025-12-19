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
    const inputPath = join(tempDir, `${id}.mmd`);
    const outputPath = join(tempDir, `${id}.pdf`);
    const puppeteerConfigPath = join(tempDir, `${id}-puppeteer-config.json`);

    tempFiles.push(inputPath);
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
    await writeFile(inputPath, inputContent);

    // 3. Execute mermaid-cli

    // Attempt to locate local bin
    // Vercel root is usually where package.json is.
    const localBinPath = resolve(process.cwd(), 'node_modules', '.bin', 'mmdc');
    const localBinPathWin = resolve(process.cwd(), 'node_modules', '.bin', 'mmdc.cmd');

    let mmdcCommand = '';

    if (process.platform === 'win32' && existsSync(localBinPathWin)) {
      mmdcCommand = `"${localBinPathWin}"`;
    } else if (existsSync(localBinPath)) {
      mmdcCommand = `"${localBinPath}"`;
    } else {
      // Fallback: try finding the script file directly
      const cliScriptPath = resolve(process.cwd(), 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'cli.js');
      if (existsSync(cliScriptPath)) {
        mmdcCommand = `node "${cliScriptPath}"`;
      } else {
        throw new Error(`Could not locate 'mmdc' binary or CLI script in node_modules.`);
      }
    }

    const command = `${mmdcCommand} -i "${inputPath}" -o "${outputPath}" -p "${puppeteerConfigPath}" --pdfFit`;
    console.log(`Executing: ${command}`);

    try {
      // Pass HOME env var to point to tempDir to avoid permission issues with dotfiles
      const env = { ...process.env, HOME: tempDir, PUPPETEER_CONFIG: puppeteerConfigPath };
      const { stdout, stderr } = await execAsync(command, { env });
      console.log('mmdc stdout:', stdout);
      if (stderr) console.error('mmdc stderr:', stderr);
    } catch (execError: any) {
      console.error('Execution Error:', execError);
      // Check if it's a permission denied error
      if (execError.message.includes('EACCES') || execError.message.includes('permission denied')) {
        throw new Error(`Permission denied executing mmdc. Please ensure the binary is executable.`);
      }
      throw new Error(`Conversion process failed: ${execError.message} \nStderr: ${execError.stderr}`);
    }

    if (!existsSync(outputPath)) {
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
