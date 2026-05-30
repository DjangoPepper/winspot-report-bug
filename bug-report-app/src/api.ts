// Client for the bug-report backend (AWS API Gateway + Lambda + S3).
// The endpoint and shared secret come from build-time env vars (VITE_*).
// The secret is intentionally embedded in the bundle: its only power is
// read/write access to THIS app's bug data — no AWS account access.

const API_URL: string = (import.meta as any).env.VITE_API_URL || '';
const API_SECRET: string = (import.meta as any).env.VITE_API_SECRET || '';

export const apiConfigured = Boolean(API_URL);

const authHeaders = (): Record<string, string> => ({
  'x-app-secret': API_SECRET,
});

const jsonHeaders = (): Record<string, string> => ({
  'content-type': 'application/json',
  'x-app-secret': API_SECRET,
});

/** Read the full reports array from the backend. */
export async function fetchReports<T = any>(): Promise<T[]> {
  const res = await fetch(API_URL, { headers: authHeaders() });
  if (!res.ok) throw new Error(`fetchReports failed: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.reports) ? data.reports : [];
}

/** Overwrite the full reports array on the backend. */
export async function saveReports<T = any>(reports: T[]): Promise<void> {
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify({ reports }),
  });
  if (!res.ok) throw new Error(`saveReports failed: HTTP ${res.status}`);
}

/** Upload one photo file, returns its public S3 URL. */
export async function uploadPhoto(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, dataUrl.indexOf(';')); // "image/jpeg"
  const dataBase64 = dataUrl.slice(comma + 1);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ action: 'photo', contentType: meta, dataBase64 }),
  });
  if (!res.ok) throw new Error(`uploadPhoto failed: HTTP ${res.status}`);
  const { url } = await res.json();
  return url as string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
