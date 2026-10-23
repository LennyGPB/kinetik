/** NDJSON works with POST requests and incrementally exposes real completed milestones. */
export function eventStream(work: (send: (event: Record<string, unknown>) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => { if (!closed) { try { controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); } catch { closed = true; } } };
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 10_000);
      try { await work(send); }
      catch { send({ type: "error", error: "unavailable" }); }
      finally { clearInterval(heartbeat); if (!closed) { closed = true; controller.close(); } }
    },
    cancel() { closed = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
