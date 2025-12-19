import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
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
    let originalName = 'mermaid-diagram';

    if (file) {
      inputContent = await file.text();
      originalName = file.name.replace(/\.(mmd|md)$/i, '');

      const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)\s*```/;
      const match = mermaidBlockRegex.exec(inputContent);
      if (match && match[1]) {
        inputContent = match[1].trim();
      }
    } else if (code) {
      inputContent = code;
    }

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

    const puppeteerConfig = {
      executablePath: executablePath,
      headless: chromium.headless,
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

    const command = `npx -y @mermaid-js/mermaid-cli -i "${inputPath}" -o "${outputPath}" -p "${puppeteerConfigPath}" --pdfFit`;
    console.log(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      console.log('stdout:', stdout);
      if (stderr) console.error('stderr:', stderr);
    } catch (execError: any) {
      console.error('Execution Error:', execError);
      throw new Error(`Conversion process failed: ${execError.message} \nStderr: ${execError.stderr}`);
    }

    if (!existsSync(outputPath)) {
      throw new Error("PDF file was not created by the converter.");
    }

    const pdfBuffer = await readFile(outputPath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}.pdf"`,
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
