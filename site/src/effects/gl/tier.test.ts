import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bufferSize, fxTier, parseFxQuery, pickLive, type FxSignals } from './tier.ts';

const desktop: FxSignals = {
  search: '',
  reducedMotion: false,
  webgl: true,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  coarsePointer: false,
  viewportWidth: 1920,
};

describe('fxTier', () => {
  test('a capable desktop gets full quality', () => {
    assert.equal(fxTier(desktop), 'full');
  });

  test('no WebGL is off even when the link forces full', () => {
    assert.equal(fxTier({ ...desktop, webgl: false, search: '?fx=full' }), 'off');
  });

  test('reduced motion is off by default', () => {
    assert.equal(fxTier({ ...desktop, reducedMotion: true }), 'off');
  });

  test('?fx= overrides every heuristic except missing WebGL', () => {
    assert.equal(fxTier({ ...desktop, search: '?fx=off' }), 'off');
    assert.equal(fxTier({ ...desktop, search: '?fx=low' }), 'low');
    assert.equal(fxTier({ ...desktop, reducedMotion: true, search: '?fx=full' }), 'full');
    assert.equal(fxTier({ ...desktop, hardwareConcurrency: 2, search: '?a=1&fx=full' }), 'full');
  });

  test('an unknown ?fx= value is ignored', () => {
    assert.equal(fxTier({ ...desktop, search: '?fx=ultra' }), 'full');
  });

  test('phones and small viewports get low', () => {
    assert.equal(fxTier({ ...desktop, coarsePointer: true }), 'low');
    assert.equal(fxTier({ ...desktop, viewportWidth: 390 }), 'low');
  });

  test('modest hardware gets low, weak hardware gets off', () => {
    assert.equal(fxTier({ ...desktop, deviceMemory: 3 }), 'low');
    assert.equal(fxTier({ ...desktop, hardwareConcurrency: 3 }), 'low');
    assert.equal(fxTier({ ...desktop, deviceMemory: 2 }), 'off');
    assert.equal(fxTier({ ...desktop, hardwareConcurrency: 2 }), 'off');
  });

  test('browsers without deviceMemory are judged on cores alone', () => {
    assert.equal(fxTier({ ...desktop, deviceMemory: undefined }), 'full');
  });
});

describe('parseFxQuery', () => {
  test('reads only the three tiers', () => {
    assert.equal(parseFxQuery('?fx=low'), 'low');
    assert.equal(parseFxQuery('fx=full'), 'full');
    assert.equal(parseFxQuery(''), null);
    assert.equal(parseFxQuery('?fx=FULL'), null);
  });
});

describe('bufferSize', () => {
  test('scales CSS pixels and never multiplies by a DPR above 1', () => {
    assert.deepEqual(bufferSize(1920, 1080, 2, 0.5), { width: 960, height: 540 });
    assert.deepEqual(bufferSize(1920, 1080, 1, 0.35), { width: 672, height: 378 });
  });

  test('a DPR below 1 shrinks the buffer further', () => {
    assert.deepEqual(bufferSize(1000, 500, 0.5, 0.5), { width: 250, height: 125 });
  });

  test('never returns an empty buffer', () => {
    assert.deepEqual(bufferSize(0, 1, 1, 0.5), { width: 1, height: 1 });
  });
});

describe('pickLive', () => {
  const slots = [
    { key: 'hero', near: true, distance: 900 },
    { key: 'metrics', near: true, distance: 100 },
    { key: 'reviews', near: true, distance: 400 },
    { key: 'cta', near: false, distance: 50 },
  ];

  test('keeps at most max slots, nearest first, and only near ones', () => {
    assert.deepEqual([...pickLive(slots, 2)], ['metrics', 'reviews']);
  });

  test('a far slot never gets a context even with budget left', () => {
    assert.equal(pickLive(slots, 4).has('cta'), false);
  });
});
