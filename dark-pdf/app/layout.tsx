import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PDF Dark Mode Converter",
  description: "Convert PDFs to dark mode in your browser",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className="font-mono"
        style={{
          fontFamily: "'Courier New', 'Monaco', 'Menlo', 'Consolas', 'SF Mono', monospace",
        }}
      >
        {children}
      </body>
    </html>
  )
}
