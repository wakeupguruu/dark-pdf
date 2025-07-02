import PDFDarkConverter from "@/components/PDFDarkConverter"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="text-center py-12">
        <h1 className="text-3xl font-mono tracking-wide">PDF DARK MODE CONVERTER</h1>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <PDFDarkConverter />
        </div>
      </div>
      {/* Footer */}
      <div className="py-8">{/* Clean empty footer */}</div>
    </div>
  )
}
