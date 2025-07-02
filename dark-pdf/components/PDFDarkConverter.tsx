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

  const isImageRegion = (imageData: ImageData, x: number, y: number, width: number, height: number) => {
    const sampleSize = 20
    let colorVariance = 0
    let sampleCount = 0
    for (let sy = y; sy < y + height && sy < imageData.height; sy += Math.floor(height / sampleSize)) {
      for (let sx = x; sx < x + width && sx < imageData.width; sx += Math.floor(width / sampleSize)) {
        const idx = (sy * imageData.width + sx) * 4
        const r = imageData.data[idx]
        const g = imageData.data[idx + 1]
        const b = imageData.data[idx + 2]
        const avg = (r + g + b) / 3
        colorVariance += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg)
        sampleCount++
      }
    }
    return sampleCount > 0 && colorVariance / sampleCount > 30
  }

  const convertPixelToDarkMode = (r: number, g: number, b: number, a: number, isPhoto = false) => {
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    if (a < 50) return [r, g, b, a]
    if (isPhoto) {
      const factor = brightness > 0.5 ? 0.7 : 1.2
      return [
        Math.max(0, Math.min(255, r * factor)),
        Math.max(0, Math.min(255, g * factor)),
        Math.max(0, Math.min(255, b * factor)),
        a,
      ]
    }
    if (brightness > 0.9) {
      return [25, 25, 25, a]
    } else if (brightness > 0.8) {
      return [Math.max(20, r - 200), Math.max(20, g - 200), Math.max(20, b - 200), a]
    } else if (brightness > 0.6) {
      return [Math.max(10, r * 0.3), Math.max(10, g * 0.3), Math.max(10, b * 0.3), a]
    } else if (brightness > 0.4) {
      return [Math.max(0, r * 0.6), Math.max(0, g * 0.6), Math.max(0, b * 0.6), a]
    } else if (brightness < 0.1) {
      return [220, 220, 220, a]
    } else if (brightness < 0.2) {
      return [190, 190, 190, a]
    } else {
      return [Math.min(255, r + 120), Math.min(255, g + 120), Math.min(255, b + 120), a]
    }
  }

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
    try {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
      document.head.appendChild(script)
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
      })
      const pdfjsLib = (window as any).pdfjsLib
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
              try {
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
              } catch (textError) {
              }
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
      downloadPDF(pdfBytes, file.name)
      setProgress((prev) => ({ ...prev, status: "completed" }))
      setTimeout(() => {
        resetToIdle()
      }, 500)
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

  return (
    <>
      {/* Upload Area */}
      {progress.status === "idle" && (
        <div
          className={`border-2 border-dashed rounded-none p-16 text-center cursor-pointer transition-colors ${
            isDragOver ? "border-white bg-gray-900" : "border-gray-600 hover:border-gray-400"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
          <Upload className="w-16 h-16 mx-auto mb-6 text-gray-400" />
          <p className="text-xl mb-2 font-mono">DROP PDF HERE OR CLICK TO UPLOAD</p>
          <p className="text-gray-500 font-mono text-sm">OPTIMIZED FOR TEXT + IMAGES + REASONABLE FILE SIZE</p>
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
            <p className="text-gray-500 font-mono text-sm">SMART PROCESSING FOR TEXT AND IMAGES...</p>
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
          <p className="text-xl font-mono text-green-400">DOWNLOAD STARTED!</p>
          <p className="text-gray-400 font-mono">READY FOR NEXT PDF</p>
          <p className="text-gray-500 font-mono text-sm">UPLOAD ANOTHER FILE TO CONTINUE</p>
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