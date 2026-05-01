import { describe, it, expect } from 'vitest';
import { transformSupabaseImage, avatarUrl } from './storageImage';

const SUPA_OBJECT = 'https://abc.supabase.co/storage/v1/object/public/avatars/foo/bar.jpg';
const SUPA_RENDER = 'https://abc.supabase.co/storage/v1/render/image/public/avatars/foo/bar.jpg?width=100';
const VERCEL_BLOB = 'https://abc.public.blob.vercel-storage.com/foo/bar.jpg';

describe('transformSupabaseImage', () => {
  it('rewrites object URLs to render URLs with sizing params', () => {
    const out = transformSupabaseImage(SUPA_OBJECT, { width: 400, quality: 70 });
    expect(out).toContain('/storage/v1/render/image/public/avatars/foo/bar.jpg');
    expect(out).toContain('width=400');
    expect(out).toContain('quality=70');
    expect(out).toContain('resize=cover');
  });

  it('replaces existing query params on render URLs', () => {
    const out = transformSupabaseImage(SUPA_RENDER, { width: 200 });
    expect(out).toContain('width=200');
    expect(out).not.toContain('width=100');
  });

  it('passes through non-Supabase URLs unchanged', () => {
    expect(transformSupabaseImage(VERCEL_BLOB, { width: 400 })).toBe(VERCEL_BLOB);
    expect(transformSupabaseImage('https://example.com/x.jpg', { width: 400 })).toBe('https://example.com/x.jpg');
  });

  it('handles null/undefined safely', () => {
    expect(transformSupabaseImage(null)).toBe(null);
    expect(transformSupabaseImage(undefined)).toBe(undefined);
    expect(transformSupabaseImage('')).toBe('');
  });

  it('rounds non-integer dimensions', () => {
    const out = transformSupabaseImage(SUPA_OBJECT, { width: 199.7 });
    expect(out).toContain('width=200');
  });
});

describe('avatarUrl', () => {
  it('uses 2x the rendered size for retina', () => {
    const out = avatarUrl(SUPA_OBJECT, 100);
    expect(out).toContain('width=200');
    expect(out).toContain('height=200');
  });

  it('floors at 48px to avoid pointless tiny variants', () => {
    const out = avatarUrl(SUPA_OBJECT, 16);
    expect(out).toContain('width=48');
  });

  it('returns falsy input as-is', () => {
    expect(avatarUrl(null, 100)).toBe(null);
    expect(avatarUrl('', 100)).toBe('');
  });
});
