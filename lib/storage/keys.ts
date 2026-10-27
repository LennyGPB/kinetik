export const UPLOAD_PREFIX = "/api/uploads/";

export function isStorageKey(key: string): boolean {
  return /^[A-Za-z0-9_-]+\/(image|audio|video)\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]{1,8})?$/.test(key);
}

export function uploadKey(url: string): string | null {
  if (!url.startsWith(UPLOAD_PREFIX)) return null;
  const key = url.slice(UPLOAD_PREFIX.length);
  return isStorageKey(key) ? key : null;
}

/** Images du studio Claude privé (vidéos Créations) : rangées sous community/, lisibles par tous. */
export const COMMUNITY_OWNER = "community";

export function isCommunityUpload(url: string): boolean {
  return uploadKey(url)?.split("/")[0] === COMMUNITY_OWNER;
}

export function ownsUpload(userId: string, url: string): boolean {
  const key = uploadKey(url);
  return Boolean(key && key.split("/")[0] === userId);
}
