import { apiFetchBlob } from '@/lib/api-client';

/** Downloads a binary API response (e.g. a PDF) to the user's machine. */
export async function downloadFile(path: string, filename: string) {
  const blob = await apiFetchBlob(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Opens a binary API response (e.g. a PDF) in a new tab for printing/preview. */
export async function openFileInNewTab(path: string) {
  const blob = await apiFetchBlob(path);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
