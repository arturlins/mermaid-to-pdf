'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, FileText, Download, Code, ArrowRight, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import mermaid from 'mermaid';

// Global Mermaid config: Force pure SVG text rendering for all diagram types
// This avoids foreignObject HTML elements which svg2pdf.js cannot process
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: { htmlLabels: false },
  sequence: { useMaxWidth: false },
  class: { htmlLabels: false },
  journey: { useMaxWidth: false },
  pie: { textPosition: 0.5 },
});

export default function Home() {
  const [code, setCode] = useState<string>('graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [syntaxValid, setSyntaxValid] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderPreview = async () => {
      if (!code) {
        if (previewRef.current) {
          previewRef.current.innerHTML = '';
        }
        setSyntaxValid(true);
        return;
      }

      try {
        await mermaid.parse(code);
        setSyntaxValid(true);

        if (previewRef.current) {
          // Re-apply config to ensure pure SVG text rendering
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            flowchart: { htmlLabels: false },
            sequence: { useMaxWidth: false },
            class: { htmlLabels: false },
            journey: { useMaxWidth: false },
            pie: { textPosition: 0.5 },
          });
          const { svg } = await mermaid.render('mermaid-preview', code);
          previewRef.current.innerHTML = svg;
        }
      } catch (e) {
        setSyntaxValid(false);
      }
    };

    const timeoutId = setTimeout(renderPreview, 300);
    return () => clearTimeout(timeoutId);
  }, [code]);


  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (uploadedFile: File) => {
    if (!uploadedFile.name.match(/\.(md|mmd)$/)) {
      setError("Please upload a .md or .mmd mermaid file.");
      return;
    }
    setFile(uploadedFile);
    setError(null);
    setDownloadUrl(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const mermaidBlockRegex = /```mermaid\s*([\s\S]*?)\s*```/;
      const match = mermaidBlockRegex.exec(text);
      if (match && match[1]) {
        setCode(match[1].trim());
      } else {
        setCode(text);
      }
    };
    reader.readAsText(uploadedFile);
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handleDownload = async () => {
    if (!downloadUrl) return;

    try {
      // 1. Capture the Live SVG
      const svgElement = previewRef.current?.querySelector('svg');
      if (!svgElement) {
        throw new Error("SVG element not found. Please ensure the diagram is rendered.");
      }

      // Clone the SVG to avoid modifying the live DOM
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // 2. Convert any foreignObject elements to native SVG text
      // svg2pdf.js does NOT support foreignObject - this is the key fix
      const convertForeignObjectToText = (svg: SVGElement) => {
        const foreignObjects = svg.querySelectorAll('foreignObject');
        foreignObjects.forEach(fo => {
          // Extract text content from the foreignObject HTML
          const textContent = fo.textContent?.trim() || '';
          if (!textContent) {
            fo.remove();
            return;
          }

          // Get position from foreignObject
          const x = parseFloat(fo.getAttribute('x') || '0');
          const y = parseFloat(fo.getAttribute('y') || '0');
          const width = parseFloat(fo.getAttribute('width') || '100');
          const height = parseFloat(fo.getAttribute('height') || '20');

          // Try to get computed styles from the HTML content
          const htmlDiv = fo.querySelector('div, span, p');
          let fontSize = '14';
          let fontFamily = 'arial, sans-serif';
          let fill = '#333333';

          if (htmlDiv && htmlDiv instanceof HTMLElement) {
            const computed = window.getComputedStyle(htmlDiv);
            fontSize = computed.fontSize?.replace('px', '') || '14';
            fontFamily = computed.fontFamily || fontFamily;
            fill = computed.color || fill;
          }

          // Create SVG text element as replacement
          const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          svgText.setAttribute('x', String(x + width / 2));
          svgText.setAttribute('y', String(y + height / 2 + parseFloat(fontSize) / 3));
          svgText.setAttribute('text-anchor', 'middle');
          svgText.setAttribute('dominant-baseline', 'middle');
          svgText.setAttribute('fill', fill);
          svgText.setAttribute('font-size', fontSize);
          svgText.setAttribute('font-family', fontFamily);
          svgText.textContent = textContent;

          // Replace foreignObject with SVG text
          fo.parentNode?.replaceChild(svgText, fo);
        });
      };

      convertForeignObjectToText(clonedSvg);

      // 3. Deep Style Inlining - Fixed for SVG elements (not HTMLElement)
      const traverseAndStyle = (source: Element, clone: Element) => {
        // SVG elements are Element instances, NOT HTMLElement
        const computed = window.getComputedStyle(source);

        // Critical styling properties for Mermaid/SVG
        const properties = [
          'fill', 'stroke', 'stroke-width', 'font-family', 'font-size',
          'font-weight', 'opacity', 'text-anchor', 'dominant-baseline',
          'alignment-baseline', 'text-decoration', 'stroke-dasharray'
        ];

        properties.forEach(prop => {
          const val = computed.getPropertyValue(prop);
          if (val && val !== 'none' && val !== 'auto' && val !== 'normal') {
            // For SVG elements, use setAttribute for presentation attributes
            clone.setAttribute(prop, val);
          }
        });

        // Also explicitly copy marker attributes from source attributes
        const markerProps = ['marker-start', 'marker-end', 'marker-mid'];
        markerProps.forEach(prop => {
          const attrVal = source.getAttribute(prop);
          if (attrVal) {
            clone.setAttribute(prop, attrVal);
          }
        });

        // Recurse into children
        const sourceChildren = Array.from(source.children);
        const cloneChildren = Array.from(clone.children);

        for (let i = 0; i < sourceChildren.length; i++) {
          if (cloneChildren[i]) {
            traverseAndStyle(sourceChildren[i], cloneChildren[i]);
          }
        }
      };

      traverseAndStyle(svgElement, clonedSvg);

      // 4. Perfect Fit-page PDF
      const bbox = svgElement.getBBox();
      const padding = 40; // 20px padding on each side
      const margin = padding / 2;
      const width = bbox.width + padding;
      const height = bbox.height + padding;

      // Import PDF libraries
      const { jsPDF } = await import('jspdf');
      await import('svg2pdf.js');

      const pdf = new jsPDF({
        orientation: width > height ? 'l' : 'p',
        unit: 'pt',
        format: [width, height]
      });

      // 5. Render to PDF
      await pdf.svg(clonedSvg, {
        x: margin,
        y: margin,
        width: bbox.width,
        height: bbox.height
      });

      // Determine filename
      let fileName = 'mermaid-diagram.pdf';
      if (file && file.name) {
        fileName = file.name.replace(/\.(md|mmd)$/i, '') + '.pdf';
      }

      pdf.save(fileName);

    } catch (e) {
      console.error(e);
      setError("Failed to download PDF: " + (e as Error).message);
    }
  };


  const convert = async () => {
    setIsConverting(true);
    setError(null);
    setDownloadUrl(null);

    try {
      // Small delay to simulate processing/make UI feel responsive
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!code) {
        throw new Error("No Mermaid code to convert.");
      }

      if (!syntaxValid) {
        throw new Error("Syntax error in Mermaid code.");
      }

      // Set a dummy URL to trigger the UI state (button visibility)
      // The logic is now entirely Client-Side in handleDownload
      setDownloadUrl('local-svg-render');

    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setIsConverting(false);
    }
  };



  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 gap-6 max-w-[1920px] mx-auto w-full">
      {/* Header */}
      <header className="w-full flex justify-between items-center py-4 border-b border-white/10 mb-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 flex items-center gap-2">
          <span className="bg-primary/20 p-2 rounded-lg text-primary"><Code size={24} /></span>
          Mermaid to PDF
        </h1>
        <div className="text-sm text-muted-foreground">High Quality Conversions</div>
      </header>

      {/* Main Grid: 3 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 w-full gap-8 flex-1 min-h-[500px]">

        {/* Col 1: Code Editor */}
        <div className="flex flex-col gap-4 bg-secondary/30 rounded-2xl p-6 border border-white/5 shadow-xl backdrop-blur-sm h-full min-h-[500px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Mermaid Editor
            </h2>
            <div className="flex items-center gap-4">
              <div className={clsx("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", syntaxValid ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10")}>
                {syntaxValid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {syntaxValid ? "Syntax Valid" : "Syntax Error"}
              </div>
              <button
                onClick={() => setCode('')}
                className="text-xs text-muted-foreground hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (file) setFile(null); // Clear file selection when editing code manually
                if (downloadUrl) setDownloadUrl(null);
              }}
              className="w-full h-full min-h-[400px] bg-black/40 rounded-xl p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-300 border border-white/5 scrollbar-thin"
              placeholder="graph TD; A-->B;"
              spellCheck={false}
            />
            {file && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center pointer-events-none">
                {/* Allow clicking through? No, editing file usually means clearing file mode. 
                      Display overlay message but making it clickable to dismiss? 
                      Actually current logic clears file on change, so user can just start typing. 
                      We'll hide this overlay if they click/focus? 
                      Let's just show it to indicate 'File Mode' but let them type to override.
                  */}
                <p className="text-muted-foreground">File selected. Clear file to edit code.</p>
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Dropzone */}
        <div className="flex flex-col gap-4 h-full min-h-[500px]">
          <div
            className={clsx(
              "h-full rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 gap-4 text-center cursor-pointer relative overflow-hidden group",
              dragActive ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20 hover:bg-white/5 bg-secondary/20"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".md,.mmd"
              onChange={handleChange}
            />

            <AnimatePresence mode='wait'>
              {file ? (
                <motion.div
                  key="file-selected"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{file.name}</h3>
                    <p className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setDownloadUrl(null); }}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Remove File
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="drop-zone"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  className="flex flex-col items-center gap-3 pointer-events-none"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload size={20} className="text-white/60 group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">Drop Mermaid file</h3>
                    <p className="text-muted-foreground text-xs">or click to browse</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Col 3: Live Preview */}
        <div className="flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-xl h-full min-h-[500px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              Live Preview
            </h2>
            <span className="text-xs text-gray-400">SVG Output</span>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto bg-white p-2 w-full h-full relative">
            {/* Mermaid container */}
            <div ref={previewRef} className="w-full h-full flex items-center justify-center" />

            {!syntaxValid && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="text-red-500 font-medium flex flex-col items-center gap-2">
                  <AlertCircle size={32} />
                  <span>Syntax Error</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Action / Result Panel - Moved to bottom */}
      <div className="w-full bg-secondary/20 rounded-2xl p-8 border border-white/5 flex flex-col items-center justify-center text-center gap-6 mt-4 backdrop-blur-sm shadow-2xl">

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">
            {file ? 'Ready to Convert File' : 'Ready to Convert Code'}
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {file ? `Convert "${file.name}" to PDF.` : 'Convert the Mermaid code from the editor above to a high-quality PDF.'}
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={convert}
            disabled={isConverting || (!code && !file)}
            className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/20 min-w-[200px]"
          >
            {isConverting ? (
              <>
                <Loader2 className="animate-spin" size={24} /> Converting...
              </>
            ) : (
              <>
                Convert Now <ArrowRight size={24} />
              </>
            )}
          </button>

          <AnimatePresence>
            {downloadUrl && !isConverting && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, x: -20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                className=""
              >
                <button
                  onClick={handleDownload}
                  className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 min-w-[200px]"
                >
                  <Download size={24} /> Download PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2"
          >
            <AlertCircle size={16} className="shrink-0" /> {error}
          </motion.div>
        )}

      </div>
    </main>
  );
}
