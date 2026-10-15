export class PayloadTooLargeError extends Error {}

/** Enforce the limit while reading, including chunked requests without Content-Length. */
async function boundedBody(request: Request, maximum: number): Promise<Buffer> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maximum) throw new PayloadTooLargeError();
  if (!request.body) throw new Error("missing_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function boundedFormData(request: Request, maximum: number): Promise<FormData> {
  return new Response(new Uint8Array(await boundedBody(request, maximum)), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}

export async function boundedJson(request: Request, maximum: number) {
  return new Response(new Uint8Array(await boundedBody(request, maximum))).json();
}
