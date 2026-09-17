export interface StudyNote {
  id: string;
  sourceUrl: string;
  type: 'pdf-highlight' | 'pdf-bookmark' | 'video-snapshot';
  content: string; // The highlight text or the snapshot timestamp note
  timestamp?: number; // In seconds, for videos
  pageNumber?: number; // For PDFs
  createdAt: number;
}
