import { Timestamp } from 'firebase/firestore';

export interface VideoMetadata {
  id?: string;
  title: string;
  url: string;
  thumbnail: string;
  createdAt: Timestamp | Date;
  category?: string;
  duration?: number; // in seconds
  titleLower?: string;
}

export interface UploadState {
  title: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  tempThumbnail?: string;
  id: string; // Internal tracking id
  error?: string;
}
