import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { HttpError } from '@/utils/http-error';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    throw HttpError.badRequest('File storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
  }
  if (!client) {
    client = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

/**
 * Mints a short-lived signed upload URL scoped to a single object path. The frontend
 * PUTs the file bytes directly to Supabase Storage using this URL (never proxying
 * the file through this API), then calls back with the resulting path/fileUrl to
 * record metadata — the same pattern already used for Task/Inspection photos.
 */
export async function createSignedUploadUrl(path: string) {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(env.supabase.storageBucket).createSignedUploadUrl(path);
  if (error) throw HttpError.badRequest(`Failed to create upload URL: ${error.message}`);
  return {
    path: data.path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: getPublicUrl(data.path),
  };
}

export function getPublicUrl(path: string): string {
  const supabase = getClient();
  return supabase.storage.from(env.supabase.storageBucket).getPublicUrl(path).data.publicUrl;
}

export async function deleteObject(path: string) {
  const supabase = getClient();
  const { error } = await supabase.storage.from(env.supabase.storageBucket).remove([path]);
  if (error) throw HttpError.badRequest(`Failed to delete file: ${error.message}`);
}

/** Extracts the storage object path from a previously-issued public URL, for deletes. */
export function pathFromPublicUrl(fileUrl: string): string | null {
  const marker = `/${env.supabase.storageBucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length);
}
