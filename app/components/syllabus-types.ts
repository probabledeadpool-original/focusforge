export interface Subtopic {
  id: string;
  title: string;
  note: string;
  pageNos: string;
  links: string[];
  completed: boolean;
}

export interface Topic {
  id: string;
  title: string;
  note: string;
  pageNos: string;
  links: string[];
  completed: boolean;
  subtopics: Subtopic[];
}

export interface Subject {
  id: string;
  title: string;
  progress: number;
  topics: Topic[];
}
