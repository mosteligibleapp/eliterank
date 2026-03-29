const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mov'];

/**
 * Upload a video file to Vercel Blob
 * @param {File} file - The video file to upload
 * @returns {Promise<{ url: string, durationSeconds: number | null }>}
 */
export async function uploadVideo(file) {
  if (!file) throw new Error('No file provided');

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Video must be under 100MB');
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('video/')) {
    throw new Error('Please upload an MP4, MOV, or WebM video');
  }

  // Extract duration client-side
  const durationSeconds = await getVideoDuration(file).catch(() => null);

  // Upload to Vercel Blob
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const fileName = `videos/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

  const response = await fetch(`/api/upload?filename=${encodeURIComponent(fileName)}`, {
    method: 'POST',
    body: file,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }

  const blob = await response.json();
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
