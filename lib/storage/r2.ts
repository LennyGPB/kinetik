import "server-only";
import { S3Client, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

export function r2Config(env: Record<string, string | undefined> = process.env) {
  const names = ["R2_BUCKET_NAME", "R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;
  if (!names.some((name) => env[name])) return null;
  if (!names.every((name) => env[name]?.trim())) throw new Error("r2_config_incomplete");
  const endpoint = new URL(env.R2_ENDPOINT!);
  if (endpoint.protocol !== "https:" || !/^[a-f0-9]{32}(\.(eu|fedramp))?\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname)
    || endpoint.username || endpoint.password || endpoint.port || endpoint.pathname !== "/" || endpoint.search || endpoint.hash) throw new Error("r2_endpoint_invalid");
  const bucket = env.R2_BUCKET_NAME!.trim();
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket.includes("..")) throw new Error("r2_bucket_invalid");
  return { bucket, endpoint: endpoint.origin, accessKeyId: env.R2_ACCESS_KEY_ID!.trim(), secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim() };
}

export function createR2Store(config: NonNullable<ReturnType<typeof r2Config>>) {
  const client = new S3Client({
    region: "auto", endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 2, requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 },
  });
  return {
    client,
    bucket: config.bucket,
    async put(key: string, data: Buffer, mimeType: string) {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: mimeType, CacheControl: "private, no-store" }), { abortSignal: AbortSignal.timeout(25000) });
    },
    async get(key: string): Promise<Buffer | null> {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(25000) });
        if (!result.Body) return null;
        if (result.ContentLength === undefined || result.ContentLength > 32 * 1024 * 1024) {
          if ("destroy" in result.Body) result.Body.destroy();
          throw new Error("stored_file_too_large");
        }
        return Buffer.from(await result.Body.transformToByteArray());
      } catch (error) {
        if (error instanceof Error && error.name === "NoSuchKey") return null;
        throw error; // Never hide authentication/network errors as missing files.
      }
    },
    async list(prefix: string) {
      const files = new Map<string, number>();
      const signal = AbortSignal.timeout(25000);
      let token: string | undefined;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix, ContinuationToken: token }), { abortSignal: signal });
        for (const object of page.Contents ?? []) if (object.Key) files.set(object.Key, object.Size ?? 0);
        if (files.size > 20_000) throw new Error("storage_quota");
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
        if (page.IsTruncated && !token) throw new Error("r2_listing_incomplete");
      } while (token);
      return files;
    },
    /** Supprime tous les objets sous `prefix` (un par un : DeleteObjects exige une somme de contrôle mal gérée par R2). */
    async deletePrefix(prefix: string) {
      const keys = [...(await this.list(prefix)).keys()];
      for (let i = 0; i < keys.length; i += 8) {
        await Promise.all(keys.slice(i, i + 8).map((key) => client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: AbortSignal.timeout(15000) })));
      }
      return keys.length;
    },
    /** Dossiers de premier niveau (un par compte). */
    async listPrefixes() {
      const prefixes = new Set<string>();
      let token: string | undefined;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, Delimiter: "/", ContinuationToken: token }), { abortSignal: AbortSignal.timeout(25000) });
        for (const entry of page.CommonPrefixes ?? []) if (entry.Prefix) prefixes.add(entry.Prefix);
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (token);
      return prefixes;
    },
  };
}

let store: ReturnType<typeof createR2Store> | undefined;
export function getR2Store() {
  const config = r2Config();
  if (!config) return null;
  store ??= createR2Store(config);
  return store;
}
