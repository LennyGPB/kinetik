import { detectTempo } from "@/lib/audio/tempo";

/** Upload côté client avec suivi de progression (XHR, car fetch n'expose pas la progression d'envoi). */
export type UploadedFile = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Images : dimensions en px (calculées par le serveur) */
  width?: number;
  height?: number;
  /** Musique : tempo détecté dans le navigateur pendant l'upload */
  bpm?: number;
  beatOffset?: number;
};

/** Upload + (pour une musique) détection du tempo en parallèle. */
export async function uploadFile(file: File, kind: "image" | "audio", onProgress?: (percent: number) => void): Promise<UploadedFile> {
  const [uploaded, tempo] = await Promise.all([sendFile(file, kind, onProgress), kind === "audio" ? detectTempo(file) : null]);
  return tempo ? { ...uploaded, ...tempo } : uploaded;
}

function sendFile(file: File, kind: "image" | "audio", onProgress?: (percent: number) => void) {
  return new Promise<UploadedFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(JSON.parse(xhr.responseText || "{}").error ?? "upload_failed"));
    };
    xhr.onerror = () => reject(new Error("network_error"));
    xhr.open("POST", "/api/uploads");
    xhr.send(body);
  });
}
