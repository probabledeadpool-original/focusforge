"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Plus, ChevronRight, Info, Link as LinkIcon, BookOpen, Check, Target, Zap, MoreHorizontal, Trash2, Edit3, ExternalLink } from 'lucide-react';
import { Subject, Topic, Subtopic } from './syllabus-types';
import { MaybachLogo, MaybachText } from './Branding';

interface SyllabusForgeProps {
  subjects: Subject[];
  onUpdate: (subjects: Subject[]) => void;
}

const calculateProgress = (subject: Subject) => {
  const totalItems = subject.topics.reduce((acc, t) => acc + t.subtopics.length + 1, 0);
  if (totalItems === 0) return 0;
  
  const completedItems = subject.topics.reduce((acc, t) => {
    const subDone = t.subtopics.filter(s => s.completed).length;
    return acc + (t.completed ? 1 : 0) + subDone;
  }, 0);
  
  return (completedItems / totalItems) * 100;
};

export const SyllabusForge: React.FC<SyllabusForgeProps> = ({ subjects, onUpdate }) => {
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [activeDetails, setActiveDetails] = useState<{ type: 'topic' | 'subtopic', id: string, subjectId: string, topicId?: string } | null>(null);

  const handleAddSubject = () => {
    if (!newSubjectTitle.trim()) return;
    const newSubject: Subject = {
      id: Date.now().toString(),
      title: newSubjectTitle,
      progress: 0,
      topics: []
    };
    onUpdate([newSubject, ...subjects]);
    setNewSubjectTitle('');
    setIsAddingSubject(false);
  };

  const handleAddTopic = (subjectId: string) => {
    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        const newTopic: Topic = {
          id: Date.now().toString(),
          title: 'New Topic',
          note: '',
          pageNos: '',
          links: [],
          completed: false,
          subtopics: []
        };
        return { ...s, topics: [...s.topics, newTopic] };
      }
      return s;
    });
    onUpdate(updated);
  };

  const handleAddSubtopic = (subjectId: string, topicId: string) => {
    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        const updatedTopics = s.topics.map(t => {
          if (t.id === topicId) {
            const newSubtopic: Subtopic = {
              id: Date.now().toString(),
              title: 'New Subtopic',
              note: '',
              pageNos: '',
              links: [],
              completed: false
            };
            return { ...t, subtopics: [...t.subtopics, newSubtopic] };
          }
          return t;
        });
        return { ...s, topics: updatedTopics };
      }
      return s;
    });
    onUpdate(updated);
  };

  const toggleComplete = (subjectId: string, topicId: string, subtopicId?: string) => {
    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        const updatedTopics = s.topics.map(t => {
          if (t.id === topicId) {
            if (subtopicId) {
              const updatedSubtopics = t.subtopics.map(st => 
                st.id === subtopicId ? { ...st, completed: !st.completed } : st
              );
              return { ...t, subtopics: updatedSubtopics };
            }
            return { ...t, completed: !t.completed };
          }
          return t;
        });
        const newSubject = { ...s, topics: updatedTopics };
        return { ...newSubject, progress: calculateProgress(newSubject) };
      }
      return s;
    });
    onUpdate(updated);
  };

  const handleSiphon = (topic: Topic | Subtopic) => {
    window.dispatchEvent(new CustomEvent('siphon-topic', { 
      detail: { 
        topic: topic.title,
        subtopics: 'subtopics' in topic ? topic.subtopics : []
      } 
    }));
    // Provide haptic/visual feedback
    if ("vibrate" in navigator) navigator.vibrate(50);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center gap-4 mb-8">
        <MaybachLogo size={48} className="text-white/20" />
        <MaybachText size="text-3xl md:text-5xl" className="text-white" />

        {!isAddingSubject ? (
          <motion.button
            whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddingSubject(true)}
            className="w-full max-w-2xl h-16 border-[0.5px] border-white/20 rounded-lg flex items-center justify-center bg-white/5 backdrop-blur-sm group transition-all"
          >
            <Plus className="text-white/40 group-hover:text-white transition-colors" />
            <span className="ml-2 text-white/40 font-mono text-xs uppercase tracking-[0.3em] group-hover:text-white transition-colors">Forge New Subject</span>
          </motion.button>
        ) : (
          <motion.div 
            initial={{ height: 64, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="w-full max-w-2xl bg-white/5 border-[0.5px] border-white/40 rounded-lg overflow-hidden"
          >
            <div className="p-4 flex gap-4">
              <input 
                autoFocus
                value={newSubjectTitle}
                onChange={e => setNewSubjectTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                placeholder="Subject Title (e.g. Quantum Mechanics)"
                className="flex-1 bg-transparent border-none outline-none text-white font-heading text-xl placeholder:text-white/20"
              />
              <button 
                onClick={handleAddSubject}
                className="px-6 py-2 bg-white text-black font-bold rounded-md text-xs uppercase tracking-widest"
              >
                Forge
              </button>
              <button 
                onClick={() => setIsAddingSubject(false)}
                className="p-2 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {subjects.map(subject => (
            <SubjectCard 
              key={subject.id}
              subject={subject}
              isExpanded={expandedSubjectId === subject.id}
              onToggle={() => setExpandedSubjectId(expandedSubjectId === subject.id ? null : subject.id)}
              onAddTopic={() => handleAddTopic(subject.id)}
              onAddSubtopic={(tid: string) => handleAddSubtopic(subject.id, tid)}
              onToggleComplete={(tid: string, stid?: string) => toggleComplete(subject.id, tid, stid)}
              onSiphon={handleSiphon}
              onOpenDetails={(type: 'topic' | 'subtopic', id: string, tid?: string) => setActiveDetails({ type, id, subjectId: subject.id, topicId: tid })}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeDetails && (
          <DetailsBlade 
            details={activeDetails}
            subjects={subjects}
            onUpdate={onUpdate}
            onClose={() => setActiveDetails(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SubjectCard = ({ subject, isExpanded, onToggle, onAddTopic, onAddSubtopic, onToggleComplete, onSiphon, onOpenDetails }: any) => {
  return (
    <motion.div 
      layout
      className="relative w-full"
    >
      <motion.div 
        layout
        onClick={onToggle}
        className="w-full min-h-[80px] rounded-[40px] bg-white/5 backdrop-blur-[20px] border border-white/10 p-1 cursor-pointer group overflow-hidden"
      >
        {/* Prismatic Progress Ribbon */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5 overflow-hidden rounded-t-full">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${subject.progress}%` }}
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400"
            style={{ 
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
              backgroundSize: '200% 100%'
            }}
          />
        </div>

        {/* Liquid Progress Background */}
        <motion.div 
          className="absolute inset-0 bg-cyan-900/10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: (subject.progress / 100) * 0.3 }}
        />

        <div className="flex items-center justify-between px-8 py-4 h-full relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all">
              <ChevronRight className={`text-white transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
            <h3 className="font-heading text-2xl font-extrabold text-white lowercase tracking-tight">
              {subject.title}
            </h3>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Mastery</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-heading font-extrabold transition-all ${subject.progress > 0 ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'text-white/20'}`}>
                  {Math.round(subject.progress)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 ml-12 space-y-4 overflow-hidden relative"
          >
            {/* Main Neural Line */}
            <div className="absolute left-6 top-0 bottom-8 w-[0.5px] bg-gradient-to-b from-white/20 via-white/40 to-transparent" />
            
            {subject.topics.map((topic: any, idx: number) => (
              <TopicNode 
                key={topic.id}
                topic={topic}
                onAddSubtopic={() => onAddSubtopic(topic.id)}
                onToggleComplete={(stid?: string) => onToggleComplete(topic.id, stid)}
                onSiphon={() => onSiphon(topic)}
                onOpenDetails={(type: string, id: string) => onOpenDetails(type, id, topic.id)}
              />
            ))}

            <motion.button
              whileHover={{ x: 5 }}
              onClick={onAddTopic}
              className="ml-12 flex items-center gap-2 text-white/30 hover:text-white transition-colors py-2"
            >
              <Plus size={16} />
              <span className="text-[10px] font-mono uppercase tracking-widest">Add Topic</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const TopicNode = ({ topic, onAddSubtopic, onToggleComplete, onSiphon, onOpenDetails }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSiphoning, setIsSiphoning] = useState(false);

  const handleSiphonAction = () => {
    setIsSiphoning(true);
    onSiphon();
    setTimeout(() => setIsSiphoning(false), 1000);
  };

  return (
    <div className="relative pl-12 py-2">
      {/* Branching Line */}
      <div className="absolute left-6 top-6 w-6 h-[0.5px] bg-white/40" />
      
      <div className="flex items-center gap-4 group">
        <div 
          className="relative w-6 h-6 flex items-center justify-center cursor-pointer"
          onClick={() => onToggleComplete()}
        >
          {/* Metallic Ring */}
          <div className={`absolute inset-0 rounded-full border-[1.5px] transition-all duration-500 ${topic.completed ? 'border-cyan-400 bg-cyan-400/20' : 'border-white/20 group-hover:border-white/40'}`} />
          {topic.completed && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" 
            />
          )}
        </div>

        <div 
          className="flex-1 flex items-center justify-between cursor-pointer relative"
          onContextMenu={(e) => {
            e.preventDefault();
            handleSiphonAction();
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isSiphoning && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1] }}
              className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-lg pointer-events-none"
            />
          )}
          <div className="flex flex-col relative z-10">
            <span className={`text-lg font-heading font-bold transition-all ${topic.completed ? 'text-white/40 line-through' : 'text-white'}`}>
              {topic.title}
            </span>
            {topic.pageNos && <span className="text-[10px] text-white/30 font-mono">p. {topic.pageNos}</span>}
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenDetails('topic', topic.id); }}
              className="p-2 text-white/20 hover:text-white transition-colors"
            >
              <Info size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleSiphonAction(); }}
              className={`p-2 transition-colors ${isSiphoning ? 'text-cyan-400' : 'text-white/20 hover:text-cyan-400'}`}
              title="Siphon to Island"
            >
              <Zap size={14} className={isSiphoning ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 ml-4 space-y-2 relative"
          >
            {/* Subtopic Neural Line */}
            <div className="absolute left-2 top-0 bottom-4 w-[0.5px] bg-white/20" />
            
            {topic.subtopics.map((subtopic: any) => (
              <div key={subtopic.id} className="relative pl-8 py-1 group">
                <div className="absolute left-2 top-4 w-4 h-[0.5px] bg-white/20" />
                <div className="flex items-center gap-3">
                  <div 
                    className="relative w-4 h-4 flex items-center justify-center cursor-pointer"
                    onClick={() => onToggleComplete(subtopic.id)}
                  >
                    <div className={`absolute inset-0 rounded-full border-[1.5px] transition-all duration-500 ${subtopic.completed ? 'border-cyan-400 bg-cyan-400/20' : 'border-white/10 group-hover:border-white/30'}`} />
                    {subtopic.completed && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" 
                      />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm font-bold transition-all ${subtopic.completed ? 'text-white/30 line-through' : 'text-white/70 hover:text-white'}`}>
                      {subtopic.title}
                    </span>
                    <button 
                      onClick={() => onOpenDetails('subtopic', subtopic.id)}
                      className="p-1 text-white/10 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={onAddSubtopic}
              className="ml-8 flex items-center gap-2 text-white/20 hover:text-white transition-colors py-1"
            >
              <Plus size={12} />
              <span className="text-[9px] font-mono uppercase tracking-widest">Add Subtopic</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailsBlade = ({ details, subjects, onUpdate, onClose }: any) => {
  const subject = subjects.find((s: any) => s.id === details.subjectId);
  const topic = subject.topics.find((t: any) => t.id === (details.type === 'topic' ? details.id : details.topicId));
  const subtopic = details.type === 'subtopic' ? topic.subtopics.find((st: any) => st.id === details.id) : null;
  
  const current = subtopic || topic;

  const updateField = (field: string, value: any) => {
    const updated = subjects.map((s: any) => {
      if (s.id === details.subjectId) {
        const updatedTopics = s.topics.map((t: any) => {
          if (t.id === (details.type === 'topic' ? details.id : details.topicId)) {
            if (details.type === 'subtopic') {
              const updatedSubtopics = t.subtopics.map((st: any) => 
                st.id === details.id ? { ...st, [field]: value } : st
              );
              return { ...t, subtopics: updatedSubtopics };
            }
            return { ...t, [field]: value };
          }
          return t;
        });
        return { ...s, topics: updatedTopics };
      }
      return s;
    });
    onUpdate(updated);
  };

  const handleAddLink = () => {
    const url = prompt("Enter Resource Link:");
    if (url) {
      updateField('links', [...current.links, url]);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md h-full bg-zinc-950 border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] p-8 flex flex-col gap-8"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">
              {details.type} details
            </span>
            <input 
              value={current.title}
              onChange={e => updateField('title', e.target.value)}
              className="bg-transparent border-none outline-none text-2xl font-heading font-extrabold text-white w-full"
            />
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">Mini Note</label>
            <textarea 
              value={current.note}
              onChange={e => updateField('note', e.target.value)}
              className="w-full h-40 bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-mono text-white/70 placeholder:text-white/10 focus:border-white/20 outline-none transition-all resize-none"
              placeholder="Inject knowledge here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">Page Nos</label>
              <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-2">
                <BookOpen size={14} className="text-white/40" />
                <input 
                  value={current.pageNos}
                  onChange={e => updateField('pageNos', e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-mono text-white w-full"
                  placeholder="0-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">Resources</label>
              <button 
                onClick={handleAddLink}
                className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-95 transition-transform"
              >
                <LinkIcon size={12} /> Add Link
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">Asset Links</label>
            <div className="space-y-2">
              {current.links.length === 0 && (
                <div className="text-center py-8 text-white/10 border border-dashed border-white/10 rounded-xl">
                  No links attached
                </div>
              )}
              {current.links.map((link: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 group">
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400">
                      <LinkIcon size={12} />
                    </div>
                    <span className="text-xs text-white/60 truncate font-mono">{link}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="p-2 text-white/40 hover:text-white">
                      <ExternalLink size={14} />
                    </a>
                    <button 
                      onClick={() => updateField('links', current.links.filter((_: any, i: number) => i !== idx))}
                      className="p-2 text-white/40 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex gap-4">
           <button 
             onClick={() => {
                if (confirm('Are you sure you want to delete this?')) {
                  // Implementation for delete
                  const updated = subjects.map((s: any) => {
                    if (s.id === details.subjectId) {
                      if (details.type === 'topic') {
                        return { ...s, topics: s.topics.filter((t: any) => t.id !== details.id) };
                      } else {
                        const updatedTopics = s.topics.map((t: any) => {
                          if (t.id === details.topicId) {
                            return { ...t, subtopics: t.subtopics.filter((st: any) => st.id !== details.id) };
                          }
                          return t;
                        });
                        return { ...s, topics: updatedTopics };
                      }
                    }
                    return s;
                  });
                  onUpdate(updated);
                  onClose();
                }
             }}
             className="flex-1 py-4 rounded-xl border border-red-500/20 text-red-500 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/10 transition-all"
           >
             Erase Data
           </button>
           <button 
             onClick={onClose}
             className="flex-1 py-4 rounded-xl bg-white text-black font-bold text-[10px] uppercase tracking-[0.2em] hover:scale-[0.98] transition-all"
           >
             Save Changes
           </button>
        </div>
      </motion.div>
    </div>
  );
};

const X = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
