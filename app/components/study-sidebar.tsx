"use client";

import React from 'react';
import { StudyNote } from './types';
import { InteractiveGlassPanel } from './interactive-glass-panel';
import { Trash2, Download, Clock, FileText } from 'lucide-react';

export function StudySidebar({ 
  notes, 
  onDeleteNote,
  onExport
}: { 
  notes: StudyNote[];
  onDeleteNote: (id: string) => void;
  onExport: () => void;
}) {
  return (
    <InteractiveGlassPanel className="w-80 h-full flex flex-col hidden lg:flex">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-bold tracking-widest text-brand glow-text uppercase">Study Notes</h3>
        <button 
          onClick={onExport}
          className="text-xs flex items-center space-x-1 glass-btn px-2 py-1 rounded hover:glow-box hover:text-brand transition-colors"
          title="Export to Markdown"
        >
          <Download className="w-3 h-3" />
          <span>MD</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pdf-scrollbar">
        {notes.length === 0 ? (
          <div className="text-center text-text-muted text-xs uppercase tracking-widest mt-10">
            No notes yet.
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="glass-panel p-3 rounded-xl relative group text-sm border-l-4 border-l-brand">
               <button 
                 onClick={() => onDeleteNote(note.id)}
                 className="absolute top-2 right-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
               
               <div className="text-[10px] text-brand mb-1 flex items-center space-x-1 uppercase tracking-wider">
                 {note.type === 'video-snapshot' ? (
                   <><Clock className="w-3 h-3" /> <span>{Math.floor((note.timestamp || 0) / 60)}:{(Math.floor(note.timestamp || 0) % 60).toString().padStart(2, '0')}</span></>
                 ) : (
                   <><FileText className="w-3 h-3" /> <span>Page {note.pageNumber}</span></>
                 )}
               </div>
               <p className="text-gray-200 mt-1 italic leading-relaxed">
                 &quot;{note.content}&quot;
               </p>
            </div>
          ))
        )}
      </div>
    </InteractiveGlassPanel>
  );
}
