// src/lib/storageHelpers.js
// ============================================
// Helper upload/delete foto ke Supabase Storage
// ============================================

import { supabase } from './supabase';

// Upload 1 file (base64 dataUrl) ke bucket
// Return: public URL
export async function uploadPhoto(bucket, dataUrl, fileName = null) {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL');
  }

  // Convert base64 → Blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  // Bikin nama file unik
  const ext = blob.type.split('/')[1] || 'jpg';
  const name = fileName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Upload
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(name, blob, {
      contentType: blob.type,
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Upload banyak foto sekaligus
export async function uploadPhotos(bucket, dataUrls) {
  if (!dataUrls || dataUrls.length === 0) return [];

  const results = [];
  for (const dataUrl of dataUrls) {
    try {
      // Skip kalau udah URL (bukan base64)
      if (typeof dataUrl === 'string' && dataUrl.startsWith('http')) {
        results.push(dataUrl);
        continue;
      }
      const url = await uploadPhoto(bucket, dataUrl);
      results.push(url);
    } catch (err) {
      console.error('[storage] upload error:', err);
      // Skip yang gagal, tapi kasih placeholder
      results.push(null);
    }
  }

  return results.filter(Boolean);
}

// Hapus foto dari bucket
export async function deletePhoto(bucket, publicUrl) {
  if (!publicUrl) return;
  try {
    // Extract path dari URL
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/${bucket}/`);
    if (pathParts.length < 2) return;
    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
  } catch (err) {
    console.error('[storage] delete error:', err);
  }
}