# Mermaid to PDF Converter

A modern, high-performance web application designed to convert [Mermaid.js](https://mermaid.js.org/) diagrams into high-quality PDF files. Built with Next.js 14 and Tailwind CSS, featuring a sleek dark interface, real-time preview, and instant syntax validation.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Features

- **🌓 Premium Dark UI**: A carefully crafted "Lead" dark theme with subtle gradients for a modern, professional look.
- **👁️ Live Preview**: Real-time client-side rendering of your Mermaid diagrams as you type.
- **✅ Immediate Validation**: Instant visual feedback on syntax errors (Red/Green indicators).
- **📂 Drag & Drop**: Seamlessly support for `.md` and `.mmd` files. Automatically parses Mermaid code blocks from Markdown files.
- **🖨️ High-Fidelity PDFs**: Server-side conversion using `@mermaid-js/mermaid-cli` (Puppeteer) ensures crisp, vector-quality PDF output suitable for documents and presentations.
- **⚡ Three-Column Layout**: Optimized workflow with dedicated columns for **Editor**, **File Drop**, and **Live Preview**.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [clsx](https://github.com/lukeed/clsx)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Core Logic**: 
  - Frontend: `mermaid` (client-side rendering)
  - Backend: `@mermaid-js/mermaid-cli` (server-side PDF generation)

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

### `POST /api/convert`

Accepts `multipart/form-data`:

- **`code`** (string): Raw Mermaid code string.
- **`file`** (file): An uploaded `.md` or `.mmd` file.

**Returns:** A PDF file stream or a JSON error message.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
