'use client'
import { useEffect, useState } from "react";

// Placeholder URLs - replace with your actual profiles
const GITHUB_URL = "https://github.com/wakeupguruu/dark-pdf";
const LINKEDIN_URL = "https://www.linkedin.com/in/guru-vyas-16a0b82a7/";

export default function HomeClientSection() {
  // Persistent conversion count using localStorage
  const [conversionCount, setConversionCount] = useState(23);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem("pdf_conversion_count");
    if (stored) setConversionCount(Number(stored));

    // Listen for custom event
    const handler = () => {
      setConversionCount((prev) => {
        const next = prev + 1;
        localStorage.setItem("pdf_conversion_count", String(next));
        return next;
      });
    };
    window.addEventListener("pdf-converted", handler);
    return () => window.removeEventListener("pdf-converted", handler);
  }, []);

  return (
    <>
      {/* Privacy Note */}
      <div className="text-center pt-4 pb-2">
        <span className="inline-block bg-gray-900 rounded px-3 py-1 font-mono text-xs border border-gray-700 text-gray-300">
          This website runs entirely in your browser. Your files never leave your device. 100% privacy-friendly.
        </span>
      </div>
      {/* Conversion Counter */}
      <div className="text-center mb-4">
        <span className="inline-block bg-gray-900 rounded px-4 py-2 font-mono text-lg border border-gray-700 shadow">
          PDFs converted on this site: <span className="font-bold text-green-400">{conversionCount}</span>
        </span>
      </div>
      {/* Footer with social icons */}
      <div className="py-8 flex justify-center gap-6 items-center">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <svg width="28" height="28" fill="currentColor" className="text-gray-400 hover:text-white" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <svg width="28" height="28" fill="currentColor" className="text-gray-400 hover:text-white" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.27c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76 1.75.79 1.75 1.76-.78 1.76-1.75 1.76zm15.5 11.27h-3v-5.6c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97v5.7h-3v-10h2.89v1.36h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v5.59z"/></svg>
        </a>
      </div>
    </>
  );
} 