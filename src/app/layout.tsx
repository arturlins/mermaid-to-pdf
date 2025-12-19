import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mermaid to PDF',
  description: 'Convert Mermaid diagrams to PDF instantly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.className} bg-background text-foreground antialiased`}>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          {children}
        </div>
      </body>
    </html>
  );
}
