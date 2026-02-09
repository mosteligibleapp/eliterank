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

  // Try Supabase Storage first
  try {
    const url = await uploadToSupabase(file, folder);
    return url;
  } catch (supabaseError) {
    console.warn('Supabase Storage upload failed, falling back to Vercel Blob:', supabaseError.message);
  }

  // Fallback to Vercel Blob (existing /api/upload endpoint)
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
