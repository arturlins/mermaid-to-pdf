import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const code = formData.get('code') as string | null;

    if (!file && !code) {
      return NextResponse.json(
        { error: 'No mermaid code or file provided' },
        { status: 400 }
      );
    }

    let inputContent = '';
    let originalName = 'diagram';

    if (file) {
      inputContent = await file.text();
      originalName = file.name.replace(/\.(mmd|md)$/i, '');
    } else if (code) {
      inputContent = code;
    }

    // Extract mermaid code if it's wrapped in markdown code blocks
    const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)\s*```/;
    const match = mermaidBlockRegex.exec(inputContent);
    if (match && match[1]) {
      console.log("Extracted mermaid code from markdown block");
      inputContent = match[1].trim();
    }

    const id = randomUUID();
    const tempDir = os.tmpdir();
    const inputPath = join(tempDir, `${id}.mmd`);
    const outputPath = join(tempDir, `${id}.pdf`);

    tempFiles.push(inputPath);
    // outputPath is created by mmdc, but we should track it for cleanup
    tempFiles.push(outputPath);

    await writeFile(inputPath, inputContent);

    // Use npx to execute mmdc. This is more robust as it handles the binary location.
    // We explicitly call the mmdc executable from the local node_modules to ensure version control.
    // On Windows, npx works well.
    const command = `npx -y @mermaid-js/mermaid-cli -i "${inputPath}" -o "${outputPath}" --pdfFit`;

    console.log(`Executing conversion command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      console.log('MMDC Output:', stdout);
      if (stderr) console.warn('MMDC Stderr:', stderr);
    } catch (execError: any) {
      console.error("MMDC Execution Error Details:", execError);
      console.error("MMDC Stdout:", execError.stdout);
      console.error("MMDC Stderr:", execError.stderr);
      throw new Error(`Failed to convert mermaid content. Exit code: ${execError.code}. Stderr: ${execError.stderr}`);
    }

    const pdfBuffer = await readFile(outputPath);

    // Cleanup happens in finally block

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error during conversion' },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    await Promise.allSettled(
      tempFiles.map((file) => unlink(file).catch(() => { }))
    );
  }
}
