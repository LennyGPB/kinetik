import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { decorPreview } from './preview';

test('decor preview requires payment, owns its upload, and cannot bypass paid screen-demo import', async () => {
  const require = createRequire(path.join(process.cwd(), 'lib/decors/actions.test.ts'));
  let user: { id: string } | null = { id: 'owner' }, paidAmount = 0, writes = 0;
  let latest = decorPreview({ decorId: 'desk', src: '/api/uploads/owner/video/a.mp4', duration: 8, width: 1280, height: 720, fit: 'contain', audio: true, locale: 'fr' }).graph;
  const db = {
    creditTransaction: { aggregate: async () => ({ _sum: { amount: -paidAmount } }) },
    project: {
      create: async () => { writes++; return { id: 'created' }; },
      findFirst: async () => ({ versions: [{ id: 'v1', number: 1, scenes: latest }] }),
      update: async () => ({}),
    },
    projectVersion: { create: async ({ data }: { data: { number: number; scenes: typeof latest } }) => ({ id: 'v2', ...data, createdAt: new Date() }) },
    $transaction: async (operations: unknown[]) => Promise.all(operations),
  };
  const mocks: Record<string, unknown> = {
    '../auth/dal': { getCurrentUser: async () => user }, '../db': { db },
    '../storage': { isOwnUpload: (_id: string, url: string) => url.startsWith('/api/uploads/owner/'), storage: { get: async () => Buffer.alloc(100) } },
    '../rate-limit': { acquireLock: async () => 'lock', releaseLock: async () => {} },
    '../security/limits': { LIMITS: { project: [], setting: [] }, limitKey: async () => ({ ok: true }) },
    '../i18n/server': { getServerDictionary: async () => ({ locale: 'fr' }) },
    '../i18n/redirect': { localizedRedirect: async () => { throw new Error('test_redirect'); } },
    '../recordings/inspect': { inspectRecording: () => ({ duration: 8, width: 1280, height: 720 }) },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) {
    const key = require.resolve(name); originals.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module;
  }
  try {
    const { createRecording, saveRecording } = require('../recordings/actions') as typeof import('../recordings/actions');
    const settings = latest.recording!;
    const input = { name: 'My video', file: { url: settings.src, fileName: 'a.mp4', mimeType: 'video/mp4', sizeBytes: 100 }, settings, format: 'LANDSCAPE' as const, musicTrackId: null };
    user = null; assert.deepEqual(await createRecording(input), { ok: false, error: 'unauthorized' }); user = { id: 'owner' };
    assert.deepEqual(await createRecording({ ...input, file: { ...input.file, url: '/api/uploads/other/video/a.mp4' } }), { ok: false, error: 'invalid' });
    assert.deepEqual(await createRecording(input), { ok: false, error: 'insufficient_credits' });
    assert.equal(writes, 0);
    paidAmount = 4;
    assert.deepEqual(await createRecording(input), { ok: false, error: 'insufficient_credits' });
    paidAmount = 5;
    assert.deepEqual(await createRecording({ ...input, settings: { ...settings, duration: 9 } }), { ok: false, error: 'invalid' });
    await assert.rejects(createRecording(input), /test_redirect/);
    assert.equal(writes, 1);
    const plain = { ...settings, decorId: undefined };
    assert.deepEqual(await createRecording({ ...input, settings: plain }), { ok: false, error: 'insufficient_credits' });
    assert.equal(writes, 1);
    assert.deepEqual(await saveRecording('created', 1, plain), { ok: false, error: 'invalid' });
    assert.equal((await saveRecording('created', 1, { ...settings, decorId: 'cafe' })).ok, true);
    latest = { ...latest, recording: { ...plain } };
    assert.deepEqual(await saveRecording('created', 1, settings), { ok: false, error: 'invalid' });
  } finally {
    for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; }
  }
});
