"use client";

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { InteractiveGlassPanel } from './interactive-glass-panel';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  
  const publicShareUrl = "https://ais-pre-this-is-placeholder.run.app";
  const embedCode = `<iframe src="${publicShareUrl}" width="100%" height="800" style="border:none; border-radius:12px; overflow:hidden;" allow="fullscreen"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopySourceCode = async () => {
     setLoadingCode(true);
     try {
         const res = await fetch('/api/source-code');
         const data = await res.json();
         if (data.code) {
             await navigator.clipboard.writeText(data.code);
             setCodeCopied(true);
             setTimeout(() => setCodeCopied(false), 2000);
         }
     } catch (e) {
         console.error(e);
         alert("Failed to fetch source code.");
     } finally {
         setLoadingCode(false);
     }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
       <InteractiveGlassPanel className="w-full max-w-lg p-6 flex flex-col relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-brand transition-colors group">
            <X className="w-5 h-5 group-hover:glow-text"/>
          </button>
          
          <h2 className="text-xl font-bold text-brand tracking-widest uppercase glow-text mb-6">Settings</h2>

          <div className="space-y-6">
             <div>
               <h3 className="text-xs font-semibold text-white tracking-widest uppercase mb-2">Embed Software</h3>
               <p className="text-[10px] text-text-muted mb-3 tracking-wider uppercase leading-relaxed">
                 Copy the snippet below to embed the Media Extract Engine directly into any other website or Notion page. <br/><span className="text-brand">Note: This uses the Public Shared App URL to avoid authentication/CORS locks.</span>
               </p>

               <div className="relative bg-black/50 p-4 rounded-lg border border-white/10 font-mono text-[10px] text-gray-300 break-all glow-box">
                  {embedCode}
                  <button
                    onClick={handleCopy}
                    className="absolute -top-3 -right-3 p-2 bg-[#222] border border-white/10 hover:bg-white hover:text-black rounded-full transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] shadow-lg"
                    title="Copy to clipboard"
                  >
                     {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
               </div>
             </div>
             
             {/* Divider */}
             <div className="h-px w-full bg-white/10"></div>

             <div>
               <h3 className="text-xs font-semibold text-white tracking-widest uppercase mb-2">Export Source Code</h3>
               <p className="text-[10px] text-text-muted mb-3 tracking-wider uppercase leading-relaxed">
                 Copy the entire source code architecture (backend, frontend, components) to your clipboard for use with an LLM.
               </p>
               <button
                  onClick={handleCopySourceCode}
                  disabled={loadingCode}
                  className="bg-[#111] border border-white/10 hover:bg-white hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all text-xs font-bold tracking-widest uppercase py-2 px-4 rounded-lg flex items-center space-x-2 w-full justify-center disabled:opacity-50"
               >
                  {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{loadingCode ? "PACKAGING SOURCE..." : codeCopied ? "COPIED TO CLIPBOARD" : "COPY ENTIRE SOURCE CODE"}</span>
               </button>
             </div>
             
             {/* Divider */}
             <div className="h-px w-full bg-white/10"></div>
             
             <div>
                <h3 className="text-xs font-semibold text-white tracking-widest uppercase mb-2">About App</h3>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">
                  Version 1.2.0 • Stable Build
                </p>
             </div>
          </div>
       </InteractiveGlassPanel>
    </div>
  )
}
