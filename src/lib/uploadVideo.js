import { upload } from '@vercel/blob/client';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov'];

/**
 * Upload a video file directly to Vercel Blob (client-side upload).
 * Bypasses the 4.5MB serverless function body limit.
 * @param {File} file - The video file to upload
 * @returns {Promise<{ url: string, durationSeconds: number | null }>}
 */
export async function uploadVideo(file) {
  if (!file) throw new Error('No file provided');

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Video must be under 500MB');
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('video/')) {
    throw new Error('Please upload an MP4, MOV, or WebM video');
  }

  // Extract duration client-side
  const durationSeconds = await getVideoDuration(file).catch(() => null);

  // Client-side upload directly to Vercel Blob (no 4.5MB limit)
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const fileName = `videos/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

  const blob = await upload(fileName, file, {
    access: 'public',
    handleUploadUrl: '/api/upload-video',
  });

  return { url: blob.url, durationSeconds };
}

/**
 * Extract video duration using a temporary video element
 */
function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video metadata'));
    };
  });
}
