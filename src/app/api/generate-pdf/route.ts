import { NextRequest, NextResponse } from 'next/server';

// Chromium binary pack URL for serverless environments (chromium-min)
// Must match the installed @sparticuz/chromium-min version (143.0.0)
const CHROMIUM_BINARY_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.x64.tar';

export async function POST(request: NextRequest) {
  let browser = null;

  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Mermaid code is required' },
        { status: 400 }
      );
    }

    // Check if running locally or in serverless
    const isLocal = process.env.NODE_ENV === 'development';

    // Use different puppeteer packages based on environment
    if (isLocal) {
      // For local development, use full puppeteer with bundled Chromium
      const puppeteer = (await import('puppeteer')).default;
      browser = await puppeteer.launch({
        headless: true,
      });
    } else {
      // For serverless, use puppeteer-core with chromium-min
      const puppeteer = (await import('puppeteer-core')).default;
      const chromium = (await import('@sparticuz/chromium-min')).default;
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(CHROMIUM_BINARY_URL),
        headless: true,
      });
    }

    const page = await browser.newPage();

    // Create HTML page with Mermaid diagram
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              background: white; 
              display: flex; 
              justify-content: center; 
              align-items: flex-start;
              padding: 20px;
            }
            .mermaid { 
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <pre class="mermaid">
${code}
          </pre>
          <script>
            mermaid.initialize({ 
              startOnLoad: true,
              theme: 'default',
              flowchart: { htmlLabels: true }
            });
          </script>
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for Mermaid to render
    await page.waitForSelector('svg', { timeout: 10000 });

    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the SVG bounding box for fit-page PDF
    const dimensions = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return { width: 800, height: 600 };
      const rect = svg.getBoundingClientRect();
      return {
        width: Math.ceil(rect.width) + 40,
        height: Math.ceil(rect.height) + 40
      };
    });

    // Generate PDF with exact dimensions
    const pdfBuffer = await page.pdf({
      width: dimensions.width,
      height: dimensions.height,
      printBackground: true,
      pageRanges: '1',
    });

    await browser.close();
    browser = null;

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="mermaid-diagram.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);

    if (browser) {
      await browser.close();
    }

    return NextResponse.json(
      { error: 'Failed to generate PDF: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
