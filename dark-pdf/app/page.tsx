import PDFDarkConverter from "@/components/PDFDarkConverter"
import HomeClientSection from "@/components/HomeClientSection"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Client-side section: privacy note, counter, social icons */}
      <HomeClientSection />
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-mono tracking-wide">PDF DARK MODE CONVERTER</h1>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <PDFDarkConverter />
        </div>
      </div>
    </div>
  )
}

