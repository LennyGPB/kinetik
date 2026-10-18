import type { UploadedFile } from "../storage/client";

export async function uploadRecording(file: File, progress: (percent: number) => void, signal: AbortSignal): Promise<UploadedFile & { duration: number; width: number; height: number; balance: number }> {
  const prepare = await fetch("/api/recordings/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare", size: file.size }), signal });
  const destination = await prepare.json();
  if (!prepare.ok) throw new Error(destination.error);
  const send = (url: string, method: string, body: File | FormData, direct: boolean) => new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open(method, url);
    if (direct) xhr.setRequestHeader("Content-Type", "video/mp4");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => {
      signal.removeEventListener("abort", abort);
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
      else { let code = "upload_failed"; try { code = JSON.parse(xhr.responseText).error; } catch {} reject(new Error(code)); }
    };
    xhr.onerror = () => { signal.removeEventListener("abort", abort); reject(new Error("upload_failed")); };
    xhr.onabort = () => { signal.removeEventListener("abort", abort); reject(new DOMException("Aborted", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    xhr.send(body);
  });
  if (destination.local) {
    const body = new FormData(); body.append("file", file);
    return JSON.parse(await send("/api/recordings/upload", "POST", body, false));
  }
  await send(destination.url, "PUT", file, true);
  const complete = await fetch("/api/recordings/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", key: destination.key, name: file.name }), signal });
  const result = await complete.json();
  if (!complete.ok) throw new Error(result.error);
  return result;
}
