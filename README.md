# Mermaid to PDF Converter

A modern, high-performance web application designed to convert [Mermaid.js](https://mermaid.js.org/) diagrams into high-quality PDF files. Built with **Next.js 16**, **React 19**, and **Tailwind CSS**. 

Optimized for **Serverless Environments** (like Vercel) using `puppeteer-core` and `@sparticuz/chromium-min` for fast, scalable PDF generation.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Features

- **🌓 Premium Dark UI**: A carefully crafted "Lead" dark theme with subtle gradients for a modern, professional look.
- **👁️ Live Preview**: Real-time client-side rendering of your Mermaid diagrams as you type.
- **✅ Immediate Validation**: Instant visual feedback on syntax errors (Red/Green indicators).
- **📂 Drag & Drop**: Seamlessly support for `.md` and `.mmd` files. Automatically parses Mermaid code blocks from Markdown files.
- **📐 Smart PDF Sizing**: Automatically detects the SVG dimensions and generates a PDF that fits the diagram perfectly (no huge whitespace or cropped diagrams).
- **☁️ Serverless Ready**: Uses a specialized Chromium binary (`chromium-min`) optimized for AWS Lambda and Vercel, ensuring deployments work out of the box.
- **⚡ Three-Column Layout**: Optimized workflow with dedicated columns for **Editor**, **File Drop**, and **Live Preview**.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [clsx](https://github.com/lukeed/clsx)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Core Logic**: 
  - **Frontend**: `mermaid` (Live Preview)
  - **Backend**: `puppeteer-core` + `@sparticuz/chromium-min` (Serverless PDF Generation)

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mermaid-to-pdf.git
   cd mermaid-to-pdf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to start converting.

> **Note**: In local development (`NODE_ENV=development`), the app automatically switches to the full `puppeteer` package for easier debugging. In production, it uses the optimized `puppeteer-core` + `chromium-min`.

## 📖 Usage

### Using the Editor
1. Type or paste your Mermaid code into the **Left Column** (Editor).
2. Watch the **Right Column** (Preview) update instantly.
3. If the syntax is valid (Green Check ✅), scroll down to the bottom Action Panel.
4. Click **Convert Now** to generate a PDF.
5. Click **Download PDF** when it appears.

### Converting Files
1. Drag and drop a `.md` or `.mmd` file into the **Middle Column** (Dropzone).
2. The app will automatically extract the Mermaid code and preview it.
3. Click **Convert Now** in the Action Panel.

## ⚡ API Reference

The app exposes a single API route for conversion:

### `POST /api/generate-pdf`

Accepts `application/json`:

- **`code`** (string): Raw Mermaid code string.

**Returns:** A PDF file stream (`application/pdf`) or a JSON error message.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
