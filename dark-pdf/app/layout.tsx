import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PDF Dark Mode Converter",
  description: "Convert PDFs to dark mode in your browser",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
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
