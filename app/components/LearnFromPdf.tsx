"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { UrlInput } from "./url-input";
import { StudySidebar } from "./study-sidebar";
import { StudyNote } from "./types";
import { 
  FileText, Video as VideoIcon, Play, Settings as SettingsIcon, ChevronLeft, 
  Upload, HardDrive, Sparkles, FolderOpen, Clock, ArrowUpRight, Compass, Plus,
  FileCheck
} from "lucide-react";
import { SettingsModal } from "./settings-modal";
import { useAuraIntegration } from "../../hooks/useAuraIntegration";
import { usePDFStore } from "../../hooks/usePDFStore";

const PdfViewer = dynamic(() => import("./pdf-viewer").then((mod) => mod.PdfViewer), { ssr: false });
const VideoPlayerController = dynamic(() => import("./video-player-controller").then((mod) => mod.VideoPlayerController), { ssr: false });

// Curated Sample Study Documents
const CURATED_SAMPLE_PDFS = [
  {
    id: "sample_quantum",
    title: "Quantum Information & Supercomputing.pdf",
    category: "Quantum Mechanics",
    pages: 18,
    url: "https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf",
    description: "Quantum gates, entanglement entropy, and fault-tolerant computing axioms."
  },
  {
    id: "sample_dl",
    title: "Deep Learning Neural Architectures.pdf",
    category: "Machine Learning",
    pages: 24,
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Transformer attention mechanisms, backprop dynamics, and latent representations."
  },
  {
    id: "sample_thermo",
    title: "Statistical Thermodynamics & Information Theory.pdf",
    category: "Physics",
    pages: 32,
    url: "https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf",
    description: "Boltzmann distribution, Maxwell relations, and Landauer limit formulation."
  }
];

export default function LearnFromPdf({ onBack }: { onBack: () => void }) {
  const [extractedPdfs, setExtractedPdfs] = useState<{ name: string; url: string; isLocal?: boolean }[]>([
    { name: "Quantum Information & Supercomputing.pdf", url: "https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf" },
  ]);
  const [extractedVideos, setExtractedVideos] = useState<string[]>([]);
  
  const [selectedPdf, setSelectedPdf] = useState<string | File | null>(null);
  const [selectedPdfName, setSelectedPdfName] = useState<string>("document.pdf");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'local' | 'pdfs' | 'videos'>('local');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  
  // Sidebars visibility
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  // Study Notes State
  const [notes, setNotes] = useState<StudyNote[]>([]);
  
  // AURA Integration
  const { recordSession } = useAuraIntegration();
  const [studyStartTime, setStudyStartTime] = useState<number | null>(null);
  const pdfStore = usePDFStore();

  // Handle Local File Selection from Computer
  const handleLocalFileSelect = (file: File) => {
    if (!file || file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      alert("Please select a valid PDF document.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const newDoc = {
      name: file.name,
      url: objectUrl,
      isLocal: true,
    };

    setExtractedPdfs(prev => [newDoc, ...prev.filter(d => d.name !== file.name)]);
    setSelectedPdf(objectUrl);
    setSelectedPdfName(file.name);
    setSelectedVideo(null);
    pdfStore.setDocument(objectUrl, file.name);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleLocalFileSelect(file);
    }
  };

  // Track study session duration
  useEffect(() => {
    if (extractedPdfs.length > 0 || extractedVideos.length > 0 || selectedPdf) {
      if (!studyStartTime) {
        setStudyStartTime(Date.now());
      }
    }
    
    return () => {
      if (extractedPdfs.length === 0 && extractedVideos.length === 0 && !selectedPdf && studyStartTime) {
        const duration = Math.round((Date.now() - studyStartTime) / 1000 / 60);
        if (duration > 1) {
          recordSession({
            type: 'study',
            duration: Math.max(duration, 5),
            quality: 0.8 + (notes.length * 0.05),
            completed: notes.length > 0,
            note: `Studied with ${notes.length} notes taken`
          });
        }
        setStudyStartTime(null);
      }
    };
  }, [extractedPdfs.length, extractedVideos.length, selectedPdf, recordSession, studyStartTime, notes.length]);

  const handleExtract = async (mediaData: { pdfUrls?: string[], videoUrls?: string[] }) => {
    const rawPdfs = mediaData.pdfUrls || [];
    const videos = mediaData.videoUrls || [];
    
    const formattedPdfs = rawPdfs.map(url => {
      let name = "document.pdf";
      try {
        name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "document.pdf");
      } catch {
        name = "document.pdf";
      }
      return { name, url };
    });

    setExtractedPdfs(prev => [...formattedPdfs, ...prev]);
    setExtractedVideos(videos);
    
    if (videos.length > 0 && formattedPdfs.length === 0) {
       setActiveTab('videos');
    } else {
       setActiveTab('pdfs');
    }
  };

  const handleAddNote = (note: StudyNote) => {
    setNotes(prev => [note, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const exportNotesToMarkdown = () => {
    let md = "# Study Notes\n\n";
    notes.forEach(note => {
       if (note.type === 'video-snapshot') {
         md += `- **[Video @ ${Math.floor((note.timestamp || 0)/60)}:${Math.floor((note.timestamp||0)%60).toString().padStart(2,'0')}]**: "${note.content}"\n`;
       } else {
         md += `- **[PDF Page ${note.pageNumber}]**: "${note.content}"\n`;
       }
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-notes.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      {/* Hidden File Input for Native File Browser Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleLocalFileSelect(e.target.files[0]);
          }
        }}
        accept="application/pdf"
        className="hidden"
      />

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex h-[calc(100vh-2rem)] w-full overflow-hidden gap-6 text-white relative p-6"
      >
        
        {/* LEFT SIDEBAR (Input, Local Upload & Documents Roster) */}
        <div 
          className={`h-full flex flex-col hidden md:flex border border-white/10 bg-zinc-900/40 backdrop-blur-3xl relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-3xl ${leftSidebarCollapsed ? 'w-0 opacity-0 -ml-8 pointer-events-none' : 'w-84 opacity-100'}`}
        >
          <div className="p-6 border-b border-white/10 relative z-10 flex flex-col gap-4">
             <div className="flex justify-between items-center">
                  <button 
                    onClick={onBack}
                    className="p-2 rounded-full border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all group cursor-pointer"
                    title="Back to Hub"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-full border border-white/10 bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                  >
                     <SettingsIcon className="w-4 h-4" />
                  </button>
             </div>

             <div className="space-y-1">
                <h1 className="text-2xl font-mono font-bold tracking-tight text-white uppercase leading-none">
                  DOCUMENT & MEDIA OS
                </h1>
                <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                  Apple-Grade Precision PDF Engine
                </p>
             </div>
             
             {/* Open Local File Primary Action */}
             <button
               onClick={() => fileInputRef.current?.click()}
               className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/30 hover:border-cyan-400 text-white font-mono text-xs font-bold flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all cursor-pointer group active:scale-[0.98]"
             >
               <HardDrive size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
               <span>OPEN LOCAL PDF FROM COMPUTER</span>
             </button>

             {/* URL Extractor */}
             <div className="pt-2">
                <UrlInput onExtract={handleExtract} />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
              {/* TABS */}
              <div className="flex space-x-2 border-b border-white/5 pb-2">
                <button 
                    onClick={() => setActiveTab('local')}
                    className={`flex-1 py-1.5 rounded-xl text-[9px] tracking-wider font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'local' ? 'bg-white/15 text-white border border-white/20' : 'text-white/40 hover:text-white'}`}
                >
                  <Sparkles size={11} />
                  <span>Curated</span>
                </button>
                <button 
                    onClick={() => setActiveTab('pdfs')}
                    className={`flex-1 py-1.5 rounded-xl text-[9px] tracking-wider font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'pdfs' ? 'bg-white/15 text-white border border-white/20' : 'text-white/40 hover:text-white'}`}
                >
                  <FileText size={11} />
                  <span>Library ({extractedPdfs.length})</span>
                </button>
                <button 
                    onClick={() => setActiveTab('videos')}
                    className={`flex-1 py-1.5 rounded-xl text-[9px] tracking-wider font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'videos' ? 'bg-white/15 text-white border border-white/20' : 'text-white/40 hover:text-white'}`}
                >
                  <VideoIcon size={11} />
                  <span>Visuals ({extractedVideos.length})</span>
                </button>
              </div>

              {/* TAB 1: CURATED SAMPLE EDUCATIONAL DOCUMENTS */}
              {activeTab === 'local' && (
                <div className="space-y-2.5">
                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest px-1">
                    Instant Curriculum Datasets
                  </div>
                  {CURATED_SAMPLE_PDFS.map((sample) => (
                    <div
                      key={sample.id}
                      onClick={() => {
                        setSelectedPdf(sample.url);
                        setSelectedPdfName(sample.title);
                        setSelectedVideo(null);
                        pdfStore.setDocument(sample.url, sample.title);
                      }}
                      className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full font-bold">
                          {sample.category}
                        </span>
                        <span className="text-[8px] font-mono text-white/30">
                          {sample.pages} PAGES
                        </span>
                      </div>
                      <h4 className="text-xs font-mono font-bold text-white/80 group-hover:text-white truncate">
                        {sample.title}
                      </h4>
                      <p className="text-[9px] text-white/40 font-sans line-clamp-2 leading-relaxed">
                        {sample.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: LIBRARY / RECENT DOCUMENTS */}
              {activeTab === 'pdfs' && (
                <div className="space-y-2">
                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest px-1">
                    Active Documents
                  </div>
                  {extractedPdfs.map((doc, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setSelectedPdf(doc.url);
                        setSelectedPdfName(doc.name);
                        setSelectedVideo(null);
                        pdfStore.setDocument(doc.url, doc.name);
                      }} 
                      className="cursor-pointer group flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all border border-white/5 hover:border-white/15"
                    >
                       <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-all">
                         <FileText className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col truncate">
                         <span className="text-xs font-mono font-bold truncate w-full text-white/70 group-hover:text-white">
                           {doc.name}
                         </span>
                         <span className="text-[8px] font-mono text-white/30">
                           {doc.isLocal ? "LOCAL FILE" : "REMOTE SOURCE"}
                         </span>
                       </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: EXTRACTED VIDEOS */}
              {activeTab === 'videos' && (
                <div className="space-y-2">
                  {extractedVideos.length === 0 ? (
                    <div className="text-center py-8 text-white/30 font-mono text-xs">
                      No video filaments extracted.
                    </div>
                  ) : (
                    extractedVideos.map((vid, i) => {
                      const isYT = vid.includes('youtube') || vid.includes('youtu.be');
                      let filename = isYT ? "YouTube Master Stream" : "video.mp4";
                      if (!isYT) {
                        try {
                          filename = decodeURIComponent(new URL(vid).pathname.split("/").pop() || "video.mp4");
                        } catch {
                          filename = "video.mp4";
                        }
                      }
                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            setSelectedVideo(vid);
                            setSelectedPdf(null);
                          }} 
                          className="cursor-pointer group flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all border border-white/5 hover:border-white/15"
                        >
                           <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-all">
                             <Play className="w-4 h-4 ml-0.5" />
                           </div>
                           <span className="text-xs font-mono font-bold truncate w-full text-white/70 group-hover:text-white">
                             {filename}
                           </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
          </div>
        </div>

        {/* CENTER STAGE (Main Viewer / Dropzone) */}
        <div className="flex-1 h-full flex flex-col relative overflow-hidden border border-white/10 bg-zinc-900/20 backdrop-blur-xl rounded-3xl">
            {/* Sidebar Toggles (Floating) */}
            <div className="absolute top-4 left-4 flex gap-2 z-[100]">
                {leftSidebarCollapsed && (
                    <button 
                        onClick={() => setLeftSidebarCollapsed(false)}
                        className="p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all shadow-2xl cursor-pointer"
                        title="Expand Left Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                )}
            </div>
            
            <div className="absolute top-4 right-4 flex gap-2 z-[100]">
                {!leftSidebarCollapsed && (
                    <button 
                        onClick={() => setLeftSidebarCollapsed(true)}
                        className="p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all shadow-2xl cursor-pointer"
                        title="Collapse Left Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
                {rightSidebarCollapsed && (
                    <button 
                        onClick={() => setRightSidebarCollapsed(false)}
                        className="p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all shadow-2xl cursor-pointer"
                        title="Expand Right Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
                {!rightSidebarCollapsed && (
                    <button 
                        onClick={() => setRightSidebarCollapsed(true)}
                        className="p-2 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all shadow-2xl cursor-pointer"
                        title="Collapse Right Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                )}
            </div>

            {/* Drag and drop overlay indicator */}
            {isDragging && (
              <div className="absolute inset-0 z-[200] bg-cyan-950/80 backdrop-blur-2xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                <Upload size={48} className="text-cyan-400 animate-bounce" />
                <h3 className="text-xl font-mono font-bold text-white uppercase tracking-wider">
                  Drop PDF to Open in Precision Viewer
                </h3>
              </div>
            )}

            {!selectedPdf && !selectedVideo ? (
                <div className="m-auto text-center flex flex-col items-center justify-center space-y-6 relative z-10 p-12 max-w-lg">
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-28 h-28 rounded-3xl border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:scale-105 transition-all cursor-pointer group"
                   >
                      <HardDrive size={36} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                   </div>
                   <div className="space-y-2">
                     <h2 className="text-2xl font-mono font-bold tracking-tight text-white uppercase">
                       AWAITING TARGET DOCUMENT
                     </h2>
                     <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed font-mono">
                       Click below to select a PDF stored on your computer, drag & drop any document here, or choose a curated curriculum dataset.
                     </p>
                   </div>

                   <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                     <button
                       onClick={() => fileInputRef.current?.click()}
                       className="px-5 py-2.5 rounded-2xl bg-cyan-500 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-cyan-400 transition-all cursor-pointer shadow-lg active:scale-95"
                     >
                       <Upload size={14} />
                       Choose PDF from Computer
                     </button>
                     <button
                       onClick={() => {
                         const sample = CURATED_SAMPLE_PDFS[0];
                         setSelectedPdf(sample.url);
                         setSelectedPdfName(sample.title);
                         pdfStore.setDocument(sample.url, sample.title);
                       }}
                       className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                     >
                       <Sparkles size={14} className="text-cyan-400" />
                       Load Sample Dataset
                     </button>
                   </div>
                </div>
             ) : (
                <>
                   {selectedPdf && (
                     <div className="absolute inset-0 z-10">
                        <PdfViewer 
                          url={selectedPdf} 
                          onClose={() => setSelectedPdf(null)} 
                          onAddNote={handleAddNote} 
                        />
                     </div>
                   )}
                   {selectedVideo && (
                     <div className="absolute inset-0 z-20">
                        <VideoPlayerController 
                          url={selectedVideo} 
                          onClose={() => setSelectedVideo(null)} 
                          onAddNote={handleAddNote} 
                        />
                     </div>
                   )}
                </>
             )}
        </div>

        {/* RIGHT SIDEBAR (Study Notes & Export) */}
        <div className={`h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${rightSidebarCollapsed ? 'w-0 opacity-0 -mr-4 pointer-events-none' : 'w-80 opacity-100'}`}>
            <StudySidebar notes={notes} onDeleteNote={handleDeleteNote} onExport={exportNotesToMarkdown} />
        </div>

      </div>
    </>
  );
}
