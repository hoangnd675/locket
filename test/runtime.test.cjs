const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const runtime = fs.readFileSync(path.join(__dirname, '../scripts/locket.js'), 'utf8');
function runFirebase(entries) {
  let output;
  const context = {
    $request: {
      url: 'https://firebaseremoteconfig.googleapis.com/v1/projects/locket-4252a/namespaces/firebase:fetch',
      method: 'POST', headers: { 'x-client-bundle-id': 'com.locket.locket' }, body: '{}'
    },
    $response: { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'UPDATE', entries }) },
    $done(value) { output = value; },
    console: { log() {} }
  };
  vm.runInNewContext(runtime, context, { timeout: 1000 });
  assert.ok(output && output.body, 'Firebase response should be rewritten');
  return JSON.parse(output.body).entries;
}

test('keeps native dynamic caption renderers even when server list is incomplete', () => {
  const entries = runFirebase({ overlay_dynamic_captions: JSON.stringify(['standard', 'streak']) });
  const types = JSON.parse(entries.overlay_dynamic_captions);
  for (const type of ['standard', 'custom', 'location', 'weather', 'time', 'music', 'streak'])
    assert.ok(types.includes(type), `missing renderer ${type}`);
});

test('preserves native Locket picker cards while adding the 50 curated captions', () => {
  const native = [{ section: 'Native Locket', items: [
    { overlay_id: 'native:message' }, { overlay_id: 'native:music' },
    { overlay_id: 'native:location' }, { overlay_id: 'native:rating' }
  ] }];
  const entries = runFirebase({
    overlay_items: JSON.stringify(native),
    overlay_dynamic_captions: JSON.stringify(['standard', 'music', 'weather', 'time', 'custom'])
  });
  const groups = JSON.parse(entries.overlay_items);
  assert.equal(groups.reduce((n, group) => n + group.items.filter(item => String(item.overlay_id || '').startsWith('caption:cuios_')).length, 0), 50);
  assert.deepEqual(groups[0].items.map(item => item.overlay_id), ['native:message', 'native:music', 'native:location', 'native:rating']);
  assert.ok(groups.some(group => group.section === 'Tình yêu'));
  assert.ok(JSON.parse(entries.overlay_dynamic_captions).includes('weather'));
});

test('enables the existing native music caption and song-preview switches', () => {
  const entries = runFirebase({});
  assert.equal(entries.music_caption_enabled, 'true');
  assert.equal(entries.music_caption_song_preview_enabled, 'true');
});

test('does not invent live weather, time, song metadata, or a custom text editor', () => {
  const entries = runFirebase({});
  const serialized = JSON.stringify(entries);
  assert.doesNotMatch(serialized, /temperature|weather_value|song_title|artist_name|current_time/i);
  assert.ok(JSON.parse(entries.overlay_dynamic_captions).includes('custom'));
});
