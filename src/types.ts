export interface Paper {
  id: string;
  title: string;
  authors?: string;
  doi?: string;
  pdfUrl?: string;
  citation?: string;
  category?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  unifiedContent?: string;
  isUnified?: boolean;
}

export interface Annotation {
  id: string;
  paperId: string;
  userId: string;
  pageNumber: number;
  type: 'highlight' | 'underline' | 'text' | 'image' | 'drawing';
  content?: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
  };
  color: string;
  createdAt: string;
}

export interface Note {
  id: string;
  paperId: string;
  userId: string;
  content: string;
  linkedAnnotationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedReading {
  id: string;
  paperId: string;
  originalOwnerId: string;
  sharedBy: string;
  title: string;
  description?: string;
  likes: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  sharedReadingId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}
