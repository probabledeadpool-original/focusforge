"use client";

import React, { useState } from "react";
import { Loader2, X } from "lucide-react";

interface UrlInputProps {
  onExtract: (media: { pdfUrls: string[], videoUrls: string[] }) => void;
}

export function UrlInput({ onExtract }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/extract-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract media");
      }

      const data = await response.json();
      onExtract(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 relative z-10">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2 group">
        <label className="text-[10px] uppercase font-mono tracking-widest text-brand mb-1 flex items-center">
            {loading ? <span className="animate-pulse flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> PROBING URL CONTENT...</span> : "TARGET URL"}
        </label>
        <div className={`relative flex items-center glass-panel overflow-hidden transition-all duration-500 rounded-lg border ${loading ? 'border-brand glow-box shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-white/10 group-focus-within:border-brand/50'}`}>
          <div className="absolute inset-y-0 left-0 w-8 flex items-center justify-center bg-black/40 border-r border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-brand animate-ping opacity-75' : url ? 'bg-brand' : 'bg-gray-600'}`}></div>
          </div>
          <input
            type="url"
            required
            placeholder="https://example.com/document.pdf"
            className="w-full pl-12 pr-28 py-3 bg-transparent border-none text-sm focus:outline-none focus:ring-0 font-mono text-white placeholder-white/30"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="absolute right-1.5 px-6 py-2 bg-brand/10 text-brand text-[10px] tracking-widest font-bold rounded-md hover:bg-brand hover:px-8 border border-brand/20 hover:text-black hover:glow-brand transition-all disabled:opacity-30 disabled:hover:px-6 disabled:hover:bg-brand/10 disabled:hover:text-brand flex items-center justify-center min-w-[90px]"
          >
            {loading ? "INITIALIZING" : "CONNECT"}
          </button>
          
          {loading && (
             <div className="absolute bottom-0 left-0 h-0.5 bg-brand animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '100%', left: '-100%', animation: 'slide-right 1.5s infinite linear' }}></div>
          )}
        </div>
        {error && <p className="text-red-400 text-xs font-mono mt-2 uppercase flex items-center"><X className="w-3 h-3 mr-1" /> {error}</p>}
      </form>

      <style jsx>{`
        @keyframes slide-right {
           0% { transform: translateX(0); }
           100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
