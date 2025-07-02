"use client"

import React from "react"

interface ProgressProps {
  value: number
  className?: string
}

export function Progress({ value, className = "" }: ProgressProps) {
  return (
    <div
      className={`w-full h-2 bg-gray-300 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-blue-500 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
