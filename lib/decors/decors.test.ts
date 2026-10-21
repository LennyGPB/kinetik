import test from 'node:test';
import assert from 'node:assert/strict';
import { DECORS, screenMatrix } from '../../config/decors';
import { RecordingSettingsSchema } from '../recordings/model';
import { decorPreview } from './preview';
import { getExportCost } from '../../config/credits';

test('all six photo projections land on the calibrated display corners', () => {
  for (const decor of DECORS) {
    const width = 1000, height = width / decor.screenRatio;
    const m = screenMatrix(decor.corners, width, height);
    [[0,0],[width,0],[width,height],[0,height]].forEach(([x,y], index) => {
      const w = m[3]*x + m[7]*y + m[15];
      const projected = [(m[0]*x+m[4]*y+m[12])/w,(m[1]*x+m[5]*y+m[13])/w];
      projected.forEach((value, axis) => assert.ok(Math.abs(value - decor.corners[index][axis]) < .00001, `${decor.id} corner ${index}`));
    });
  }
});

test('decor preview preserves the source and audio, and cannot carry screen-demo effects', () => {
  const props = decorPreview({ decorId: 'night', src: '/api/uploads/account/video/example.mp4', duration: 30.5, width: 1920, height: 1080, fit: 'cover', audio: false, locale: 'fr' });
  const recording = props.graph.recording!;
  assert.equal(recording.src, '/api/uploads/account/video/example.mp4');
  assert.equal(recording.decorFit, 'cover');
  assert.equal(recording.originalAudio, false);
  assert.equal(props.graph.scenes[0].duration, 30.5);
  assert.ok(RecordingSettingsSchema.safeParse(recording).success);
  for (const change of [{ decorId: 'unknown' }, { decorFit: 'stretch' }, { deviceMockup: 'macbook-pro' }, { zooms: [{ id: 'one', start: 1, end: 4, x: .5, y: .5, scale: 2 }] }]) {
    assert.equal(RecordingSettingsSchema.safeParse({ ...recording, ...change }).success, false);
  }
});

test('decor exports are cheaper, with the same duration boundary and repeat discount as billing', () => {
  assert.equal(getExportCost({ duration: 30 }), 5);
  assert.equal(getExportCost({ duration: 30.001 }), 10);
  assert.equal(getExportCost({ duration: 120 }), 10);
  assert.equal(getExportCost({ duration: 30, reexport: true }), 3);
  assert.equal(getExportCost({ duration: 120, reexport: true }), 5);
  assert.equal(getExportCost({ duration: 30, decor: true }), 2);
  assert.equal(getExportCost({ duration: 30.001, decor: true }), 4);
  assert.equal(getExportCost({ duration: 120, decor: true }), 4);
  assert.equal(getExportCost({ duration: 30, decor: true, reexport: true }), 1);
  assert.equal(getExportCost({ duration: 120, decor: true, reexport: true }), 2);
});
