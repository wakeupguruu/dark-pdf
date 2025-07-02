"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
  estimatedTimeRemaining: number;
  status: "idle" | "processing" | "completed" | "error";
}


export default function PDFDarkConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<ConversionProgress>({
    currentPage: 0,
    totalPages: 0,
    percentage: 0,
    estimatedTimeRemaining: 0,
    status: "idle",
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [splash, setSplash] = useState<{ x: number; y: number; key: number } | null>(null)
  const splashTimeout = useRef<NodeJS.Timeout | null>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const [downloadInfo, setDownloadInfo] = useState<{ pdfBytes: Uint8Array; fileName: string } | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please drop a valid PDF file")
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
    } else {
      setError("Please select a valid PDF file")
    }
  }, [])

  const downloadPDF = useCallback((pdfBytes: Uint8Array, originalFileName: string) => {
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${originalFileName.replace(".pdf", "")}_dark.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  const resetToIdle = useCallback(() => {
    setFile(null)
    setProgress({
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
      estimatedTimeRemaining: 0,
      status: "idle",
    })
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const convertPixelToDarkMode = (r: number, g: number, b: number, a: number, isPhoto = false) => {
    if (a < 50) return [r, g, b, a]; // Transparent, leave as is
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    // Background: very bright
    if (brightness > 0.92) {
      return [0, 0, 0, a]; // Pure black
    }
    // Text: very dark
    if (brightness < 0.18) {
      return [255, 255, 255, a]; // Pure white
    }
    if (isPhoto) {
      // For photos/images: keep natural, but boost contrast for dark bg
      // Apply a simple contrast/brightness adjustment
      const contrast = 1.15; // Slightly boost contrast
      const brightnessAdj = 10; // Slightly brighten
      const newR = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightnessAdj));
      const newG = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightnessAdj));
      const newB = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightnessAdj));
      return [newR, newG, newB, a];
    }
    // For everything else (graphics, midtones):
    // Map to a lighter color for readability, but not pure white
    const mapped = 220 - Math.round((brightness - 0.18) / (0.92 - 0.18) * 120); // 220 to 100
    return [mapped, mapped, mapped, a];
  }

  const handleManualDownload = useCallback(() => {
    if (downloadInfo) {
      downloadPDF(downloadInfo.pdfBytes, downloadInfo.fileName)
    }
  }, [downloadInfo, downloadPDF])

  const convertToDarkMode = useCallback(async () => {
    if (!file) return
    setProgress({
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
      estimatedTimeRemaining: 0,
      status: "processing",
    })
    setError(null)
    setDownloadInfo(null)

    const processCanvasForDarkMode = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      let totalVariance = 0
      let sampleCount = 0
      const sampleStep = 50
      for (let i = 0; i < data.length; i += 4 * sampleStep) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const avg = (r + g + b) / 3
        totalVariance += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg)
        sampleCount++
      }
      const isPhotoContent = sampleCount > 0 && totalVariance / sampleCount > 25
      for (let i = 0; i < data.length; i += 4) {
        const [newR, newG, newB, newA] = convertPixelToDarkMode(
          data[i],
          data[i + 1],
          data[i + 2],
          data[i + 3],
          isPhotoContent,
        )
        data[i] = newR
        data[i + 1] = newG
        data[i + 2] = newB
        data[i + 3] = newA
      }
      ctx.putImageData(imageData, 0, 0)
    }

    try {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
      document.head.appendChild(script)
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = (window as unknown as { pdfjsLib: any }).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      const { PDFDocument, rgb } = await import("pdf-lib")
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const totalPages = pdfDoc.numPages
      const startTime = Date.now()
      setProgress((prev) => ({ ...prev, totalPages }))
      const newPdfDoc = await PDFDocument.create()
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.5 })
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        canvas.height = viewport.height
        canvas.width = viewport.width
        if (context) {
          context.imageSmoothingEnabled = true
          context.imageSmoothingQuality = "high"
        }
        if (!context) {
          throw new Error("Could not get canvas context")
        }
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        await page.render(renderContext).promise
        processCanvasForDarkMode(canvas)
        const originalViewport = page.getViewport({ scale: 1.0 })
        const pageWidth = originalViewport.width * 0.75
        const pageHeight = originalViewport.height * 0.75
        const newPage = newPdfDoc.addPage([pageWidth, pageHeight])
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        let totalVariance = 0
        let sampleCount = 0
        for (let i = 0; i < imageData.data.length; i += 4 * 100) {
          const r = imageData.data[i]
          const g = imageData.data[i + 1]
          const b = imageData.data[i + 2]
          if (r !== undefined && g !== undefined && b !== undefined) {
            const avg = (r + g + b) / 3
            totalVariance += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg)
            sampleCount++
          }
        }
        const isImageHeavy = sampleCount > 0 && totalVariance / sampleCount > 20
        const imgData = canvas.toDataURL(
          isImageHeavy ? "image/jpeg" : "image/png",
          isImageHeavy ? 0.85 : 1.0,
        )
        if (isImageHeavy) {
          const jpegImage = await newPdfDoc.embedJpg(imgData)
          newPage.drawImage(jpegImage, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
          })
        } else {
          const pngImage = await newPdfDoc.embedPng(imgData)
          newPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
          })
        }
        try {
          const textContent = await page.getTextContent()
          for (const item of textContent.items) {
            if ("str" in item && item.str.trim()) {
                const x = (item.transform[4] * pageWidth) / originalViewport.width
                const y = pageHeight - (item.transform[5] * pageHeight) / originalViewport.height
                const fontSize = Math.abs(item.transform[0]) * (pageWidth / originalViewport.width)
                newPage.drawText(item.str, {
                  x: x,
                  y: y,
                  size: Math.max(1, fontSize),
                  color: rgb(0, 0, 0),
                  opacity: 0,
                })
            }
          }
        } catch (textError) {
          console.warn("Could not extract text for searchability:", textError)
        }
        const currentPage = pageNum
        const percentage = Math.round((currentPage / totalPages) * 100)
        const elapsedTime = Date.now() - startTime
        const avgTimePerPage = elapsedTime / currentPage
        const remainingPages = totalPages - currentPage
        const estimatedTimeRemaining = Math.round((remainingPages * avgTimePerPage) / 1000)
        setProgress({
          currentPage,
          totalPages,
          percentage,
          estimatedTimeRemaining,
          status: "processing",
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      const pdfBytes = await newPdfDoc.save({
        useObjectStreams: false,
      })
      setDownloadInfo({ pdfBytes, fileName: file.name })
      setProgress((prev) => ({ ...prev, status: "completed" }))
    } catch (err) {
      console.error("Error converting PDF:", err)
      setError("Failed to convert PDF. Please try again.")
      setProgress((prev) => ({ ...prev, status: "error" }))
    }
  }, [file, downloadPDF, resetToIdle])

  useEffect(() => {
    if (file && progress.status === "idle") {
      convertToDarkMode()
    }
  }, [file, progress.status, convertToDarkMode])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const handleUploadAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (fileInputRef.current) fileInputRef.current.click()
    if (uploadAreaRef.current) {
      const rect = uploadAreaRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setSplash({ x, y, key: Date.now() })
      if (splashTimeout.current) clearTimeout(splashTimeout.current)
      splashTimeout.current = setTimeout(() => setSplash(null), 600)
    }
  }

  return (
    <>
      {/* Always present file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* Upload Area */}
      {progress.status === "idle" && (
        <div
          ref={uploadAreaRef}
          className={`relative border-2 border-dashed rounded-none p-16 text-center cursor-pointer transition-colors ${
            isDragOver ? "border-white bg-gray-900" : "border-gray-600 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadAreaClick}
        >
          {/* Splash Effect */}
          {splash && (
            <span
              key={splash.key}
              className="pointer-events-none absolute block rounded-full bg-white/20 animate-splash"
              style={{
                left: splash.x - 100,
                top: splash.y - 100,
                width: 200,
                height: 200,
              }}
            />
          )}
          <Upload className="w-16 h-16 mx-auto mb-6 text-gray-400" />
          <p className="text-xl mb-2 font-mono">DROP PDF HERE OR CLICK TO UPLOAD</p>
          <p className="text-gray-500 font-mono text-sm">CONVERT YOUR PDF TO DARK MODE</p>
        </div>
      )}
      {/* Processing State */}
      {progress.status === "processing" && (
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <p className="text-xl font-mono">CONVERTING: {file?.name}</p>
            <p className="text-gray-400 font-mono">
              PROCESSING PAGE {progress.currentPage} OF {progress.totalPages}
            </p>
            <p className="text-gray-500 font-mono text-sm">CONVERTED PDF WILL BE SAVED AS <span className="font-bold">{file?.name.replace(".pdf", "")}_dark.pdf</span></p>
          </div>
          <div className="space-y-4">
            <Progress value={progress.percentage} className="h-2 bg-gray-800" />
            <div className="flex justify-between text-sm font-mono text-gray-400">
              <span>{progress.percentage}% COMPLETE</span>
              <span>
                {progress.estimatedTimeRemaining > 0
                  ? `${formatTime(progress.estimatedTimeRemaining)} REMAINING`
                  : "CALCULATING..."}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Completed State */}
      {progress.status === "completed" && (
        <div className="text-center space-y-4">
          <p className="text-xl font-mono text-green-400">DOWNLOAD READY!</p>
          
          <button
            className="block mx-auto mb-4 px-8 py-4 text-2xl font-mono font-bold rounded border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black transition-colors"
            onClick={handleManualDownload}
          >
            Click here to download
          </button>
          <p className="text-gray-500 font-mono text-sm">
            Download the converted PDF before uploading another file.
          </p>
          <p className="text-gray-400 font-mono">READY FOR NEXT PDF</p>
          <button
            className="mx-auto flex items-center justify-center mt-2 border border-gray-600 rounded-full p-3 hover:border-white hover:text-white text-gray-400 transition-colors"
            onClick={() => {
              resetToIdle();
              setTimeout(() => fileInputRef.current?.click(), 0);
            }}
            aria-label="Upload another file"
          >
            <Upload className="w-6 h-6" />
          </button>
        </div>
      )}
      {/* Error State */}
      {error && (
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono">{error}</p>
          <button
            onClick={resetToIdle}
            className="px-6 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-colors font-mono"
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </>
  )
}