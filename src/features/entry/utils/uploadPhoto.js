import { supabase } from '../../../lib/supabase';

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * Upload a photo to Supabase Storage (avatars bucket), with fallback to Vercel Blob
 * @param {File} file - The image file to upload
 * @param {string} folder - Subfolder (e.g., 'nominations')
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadPhoto(file, folder = 'nominations') {
  if (!file) throw new Error('No file provided');

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Photo must be under 4.5MB');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WebP image');
  }

  // Try Supabase Storage with a 5s timeout, fall back to Vercel Blob
  try {
    const url = await Promise.race([
      uploadToSupabase(file, folder),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    return url;
  } catch (err) {
    console.warn('Supabase upload failed/timed out, falling back to Vercel Blob:', err.message);
  }

  return uploadToVercelBlob(file, folder);
}

/**
 * Upload to Supabase Storage
 */
async function uploadToSupabase(file, folder) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Upload to Vercel Blob via existing /api/upload endpoint
 */
async function uploadToVercelBlob(file, folder) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${folder}/${Date.now()}.${ext}`;

  const response = await fetch(`/api/upload?filename=${encodeURIComponent(fileName)}`, {
    method: 'POST',
    body: file,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Upload failed');
  }

  const blob = await response.json();
  return blob.url;
}
