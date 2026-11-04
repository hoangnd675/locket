"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const release = require("../release.json");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts/locket.js"), "utf8");
const protectedMode = process.env.CUIOS_PROTECTED_RUNTIME === "1";
const protectedRelease = protectedMode ? JSON.parse(fs.readFileSync(path.join(root, "protected-release.json"), "utf8")) : null;
const runtimeSource = protectedMode ? fs.readFileSync(path.join(root, protectedRelease.runtime), "utf8") : source;
const moduleText = fs.readFileSync(path.join(root, "locket_cuios_stable.sgmodule"), "utf8");
const rc = "https://api.revenuecat.com/v1/subscribers/test-user";
const firebase = "https://firebaseremoteconfig.googleapis.com/v1/projects/locket-4252a/namespaces/firebase:fetch";

function run(options = {}, runtime = runtimeSource) {
  let calls = 0;
  let output;
  const logs = [];
  const context = {
    $request: {
      url: options.url || rc,
      headers: options.headers || { "User-Agent": "Locket/2.0" }
    },
    $done(value) { calls++; output = JSON.parse(JSON.stringify(value)); },
    console: { log(value) { logs.push(value); } }
  };
  if (options.store) context.$persistentStore = options.store;
  if (options.method) context.$request.method = options.method;
  if (options.argument !== undefined) context.$argument = options.argument;
  if (!options.requestOnly) {
    context.$response = {
      status: options.status === undefined ? 200 : options.status,
      headers: options.responseHeaders,
      body: options.body === undefined
        ? JSON.stringify(options.payload || { subscriber: { entitlements: {}, subscriptions: {} } })
        : options.body
    };
  }
  vm.runInNewContext(runtime, context, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
  assert.equal(calls, 1, "$done must be called exactly once");
  return { output, logs, body: output.body ? JSON.parse(output.body) : undefined };
}

test("Gold entitlement and subscription use matching product and expiry", () => {
  const payload = {
    request_date: "2026-10-29T00:00:00Z",
    subscriber: {
      original_app_user_id: "private-test-user",
      entitlements: { Other: { product_identifier: "other" } },
      subscriptions: { other: { expires_date: null } }
    }
  };
  const result = run({ payload });
  const { entitlements, subscriptions } = result.body.subscriber;
  const gold = entitlements.Gold;
  assert.equal(gold.product_identifier, "locket_1600_1y");
  assert.equal(gold.expires_date, subscriptions[gold.product_identifier].expires_date);
  assert.ok(Date.parse(gold.expires_date) > Date.now());
  assert.equal(subscriptions[gold.product_identifier].is_sandbox, false);
  assert.deepEqual(entitlements.Other, payload.subscriber.entitlements.Other);
  assert.deepEqual(subscriptions.other, payload.subscriber.subscriptions.other);
  assert.equal(result.body.request_date, payload.request_date);
  assert.equal(result.body.subscriber.original_app_user_id, "private-test-user");
  assert.ok(result.logs.every(line => !line.includes("private-test-user")));
});

test("active existing Gold and lifetime Gold pass through untouched", () => {
  for (const expiry of ["2098-01-01T00:00:00Z", null]) {
    const payload = { subscriber: {
      entitlements: { Gold: { product_identifier: "locket_paid", expires_date: expiry } },
      subscriptions: { locket_paid: { expires_date: expiry, store_transaction_id: "existing" } }
    } };
    assert.deepEqual(run({ payload }).output, {});
  }
});

test("expired Locket product is reused, preserving unknown fields", () => {
  const result = run({ payload: { subscriber: {
    entitlements: { Gold: { product_identifier: "locket_monthly", expires_date: "2020-01-01T00:00:00Z", extra: true } },
    subscriptions: { locket_monthly: { extra: "keep" } }
  } } });
  assert.equal(result.body.subscriber.entitlements.Gold.product_identifier, "locket_monthly");
  assert.equal(result.body.subscriber.entitlements.Gold.extra, true);
  assert.equal(result.body.subscriber.subscriptions.locket_monthly.extra, "keep");
});

test("supports case insensitive User-Agent and payload-based Locket detection", () => {
  assert.ok(run({ headers: { "USER-AGENT": "locket/1" } }).body);
  assert.ok(run({ headers: {}, payload: { subscriber: { subscriptions: { locket_1600_1y: {} } } } }).body);
  assert.ok(run({ headers: {}, payload: { subscriber: { entitlements: { Gold: { product_identifier: "locket_monthly" } } } } }).body);
});

test("other RevenueCat apps are untouched", () => {
  assert.deepEqual(run({ headers: { "User-Agent": "OtherApp/1" } }).output, {});
  assert.deepEqual(run({ headers: {} }).output, {});
  assert.deepEqual(run({ headers: {}, payload: { subscriber: { entitlements: { Gold: { product_identifier: "other_gold" } } } } }).output, {});
});

test("receipts, encoded subscriber IDs, trailing slash and queries are supported", () => {
  for (const url of [rc + "?platform=ios", rc + "/?x=1", "https://api.revenuecat.com/v1/receipts", "https://api.revenuecat.com/v1/subscribers/%24RCAnonymousID%3Atest"]) {
    assert.ok(run({ url }).body, url);
  }
});

test("errors, empty bodies and unexpected schemas pass through", () => {
  for (const body of ["", "<html>bad gateway</html>", "{broken", "null", "[]", "{}", '{"error":"denied"}', '{"subscriber":[]}', '{"subscriber":{"subscriptions":[]}}', '{"subscriber":{"entitlements":"bad"}}']) {
    assert.deepEqual(run({ body }).output, {}, body);
  }
  for (const status of [204, 304, 400, 401, 403, 429, 500, "HTTP/1.1 503 Service Unavailable", "bad status"]) {
    const options = status === 204 ? { status, body: "" } : { status };
    assert.deepEqual(run(options).output, {}, String(status));
  }
  assert.ok(run({ status: "HTTP/1.1 200 OK" }).body);
});

test("Firebase patches video settings and preserves unrelated and nested fields", () => {
  const entries = {
    untouched: "keep",
    feature_gates: JSON.stringify({ new_feature: "enabled", longer_video: "disabled" }),
    camera: JSON.stringify({ ultra_wide: false, quality_mbps: 4, max_duration: 5 }),
    camera_roll: JSON.stringify({ custom: { retained: true } }),
    overlay_items: '[{"section":"original","items":[]}]',
    storage_bucket: "gs://original-bucket"
  };
  const result = run({ url: firebase, payload: { entries, state: "UPDATE", templateVersion: "12" } });
  const actual = result.body.entries;
  assert.equal(JSON.parse(actual.camera).max_duration, 60);
  assert.equal(JSON.parse(actual.camera).quality_mbps, 4);
  assert.equal(JSON.parse(actual.camera).ultra_wide, false);
  assert.deepEqual(JSON.parse(actual.camera_roll).custom, { retained: true });
  assert.equal(JSON.parse(actual.feature_gates).new_feature, "enabled");
  assert.equal(JSON.parse(actual.feature_gates).longer_video, "enabled");
  assert.equal(actual.video_max_duration, "60.0");
  for (const key of ["untouched", "storage_bucket"]) assert.equal(actual[key], entries[key]);
  assert.equal(JSON.parse(actual.overlay_items)[0].section, "Cuios • Bản quyền");
  assert.equal(result.body.templateVersion, "12");
  assert.ok(Object.values(actual).every(value => typeof value === "string"));
});

test("malformed nested Firebase entries are preserved", () => {
  const result = run({ url: firebase, payload: { entries: { camera: "{broken", camera_roll: "[]", feature_gates: "null" } } });
  assert.equal(result.body.entries.camera, "{broken");
  assert.equal(result.body.entries.camera_roll, "[]");
  assert.equal(result.body.entries.feature_gates, "null");
});

test("Firebase NO_CHANGE is not replaced by an incomplete synthetic config", () => {
  assert.deepEqual(run({ url: firebase, payload: { state: "NO_CHANGE" } }).output, {});
  assert.deepEqual(run({ url: firebase, payload: { entries: [] } }).output, {});
  const result = run({ url: firebase, payload: { entries: { untouched: "yes" }, state: "NO_CHANGE" } });
  assert.equal(result.body.state, "UPDATE");
});

test("cache headers are removed without losing Authorization or signature headers", () => {
  const headers = { "User-Agent": "Locket/1", Authorization: "Bearer fixture", "X-RevenueCat-ETag": "cache", "IF-NONE-MATCH": "cache", "If-Modified-Since": "yesterday", "X-Nonce": "keep" };
  const result = run({ requestOnly: true, headers });
  assert.deepEqual(result.output.headers, { "User-Agent": "Locket/1", Authorization: "Bearer fixture", "X-Nonce": "keep" });
  assert.equal(headers["X-RevenueCat-ETag"], "cache");
  assert.ok(!result.logs.join(" ").includes("Bearer"));
  assert.deepEqual(run({ requestOnly: true }).output, {});
  assert.deepEqual(run({ requestOnly: true, headers: { "User-Agent": "OtherApp", "If-None-Match": "keep" } }).output, {});
  assert.equal(run({ requestOnly: true, url: firebase, headers: { "If-None-Match": "cache", Authorization: "fixture" } }).output.headers.Authorization, "fixture");
});

test("unrelated APIs, other Firebase projects and nested subscriber routes are untouched", () => {
  for (const url of ["https://api.locketcamera.com/changeProfileInfo", "https://firebasestorage.googleapis.com/upload", rc + "/offerings", "https://api.revenuecat.com.evil.test/v1/receipts", firebase.replace("locket-4252a", "other-project"), "https://api.revenuecat.com/v2/subscribers/test-user"]) {
    assert.deepEqual(run({ url }).output, {}, url);
  }
});

const rules = moduleText.split("\n").filter(line => line.includes(" = type=")).map(line => ({
  name: line.split(" = ")[0],
  type: line.match(/type=([^,]+)/)[1],
  pattern: new RegExp(line.match(/pattern=(.*?), script-path=/)[1]),
  url: line.match(/script-path=([^,]+)/)[1]
}));

test("all module rules load an existing script in this repository", () => {
  assert.equal(rules.length, 5);
  for (const rule of rules) {
    assert.equal(rule.url, "https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/" + release.runtime);
    assert.ok(fs.existsSync(path.join(root, "scripts/locket.js")));
  }
  assert.ok(!moduleText.includes("cloudfunctions"));
});

test("60-second settings cover recording, library selection and trimming consistently", () => {
  const result = run({ url: firebase, payload: { entries: {
    camera: JSON.stringify({ video_duration: 15, recording_duration: 15 }),
    camera_roll: JSON.stringify({ trim_max_duration: 15, camera_roll_video_max_duration: 15, maximum_duration: 15, maximumDuration: 15, enabled: false }),
    max_video_record_duration: "15", video_upload_max_duration: "15", longerVideoDuration: "15",
    can_record_video: "false", can_upload_video: "false"
  } } });
  const entries = result.body.entries;
  for (const key of ["camera", "camera_roll"]) {
    const config = JSON.parse(entries[key]);
    for (const [field, value] of Object.entries(config)) {
      if (/duration|Duration/.test(field)) assert.equal(value, 60, key + "." + field);
    }
  }
  for (const [key, value] of Object.entries(entries)) {
    if (/duration/i.test(key)) assert.equal(value, "60.0", key);
  }
  for (const key of ["camera_roll_preview_enabled", "camera_roll_video_enabled", "camera_roll_video_upload_enabled", "internal_camera_roll_video_upload_enabled", "longer_camera_roll_videos_enabled"]) {
    assert.equal(entries[key], "true", key);
  }
  const gates = JSON.parse(entries.feature_gates);
  for (const key of ["longer_video", "longer_videos", "video_recording", "video_upload", "camera_roll_video"]) assert.equal(gates[key], "enabled");
  assert.equal(JSON.parse(entries.camera_roll).enabled, true);
  assert.equal(entries.can_record_video, "true");
  assert.equal(entries.can_upload_video, "true");
});

test("existing video schema keeps codecs, units and unknown fields", () => {
  const original = {
    video_config: JSON.stringify({ max_duration: 15, recording_duration: 15, max_duration_ms: 15000,
      video_codec: "h264", max_upload_bytes: 15000, fps: 15, unknown: { duration: 15 } }),
    android_camera_video_recording: '{"gold":{"maximum_duration":15000}}'
  };
  const entries = run({ url: firebase, payload: { entries: original } }).body.entries;
  const config = JSON.parse(entries.video_config);
  assert.equal(config.max_duration, 60);
  assert.equal(config.recording_duration, 60);
  assert.equal(config.max_duration_ms, 60000);
  assert.equal(config.video_codec, "h264");
  assert.equal(config.max_upload_bytes, 104857600);
  assert.equal(config.fps, 15);
  assert.deepEqual(config.unknown, { duration: 15 });
  assert.equal(entries.android_camera_video_recording, original.android_camera_video_recording);
  assert.equal(run({ url: firebase, payload: { entries: {} } }).body.entries.video_config, undefined);
});

test("sound and mic flags are enabled, while existing mute/strip flags are disabled", () => {
  const result = run({ url: firebase, payload: { entries: {
    camera: JSON.stringify({ microphone_enabled: false, muted: true, audio: { enabled: false, codec: "aac", remove_audio: true } }),
    camera_roll: JSON.stringify({ preserve_audio: false, strip_audio: "true", sound_enabled: "false", codec: "aac" }),
    video_config: JSON.stringify({ include_audio: false, mute: true })
  } } });
  const entries = result.body.entries;
  for (const key of ["video_sound_enabled", "microphone_enabled", "camera_microphone_enabled"]) assert.equal(entries[key], "true");
  const camera = JSON.parse(entries.camera);
  assert.equal(camera.microphone_enabled, true);
  assert.equal(camera.muted, false);
  assert.deepEqual(camera.audio, { enabled: true, codec: "aac", remove_audio: false });
  const roll = JSON.parse(entries.camera_roll);
  assert.equal(roll.preserve_audio, true);
  assert.equal(roll.strip_audio, "false");
  assert.equal(roll.sound_enabled, "true");
  assert.equal(roll.codec, "aac");
  assert.equal(JSON.parse(entries.video_config).include_audio, true);
  assert.equal(JSON.parse(entries.video_config).mute, false);
});

test("94 replacement captions have exact branded ordering, unique IDs and matching registration", () => {
  const result = run({ url: firebase, payload: { entries: {
    overlay_items: '[{"section":"old","items":[{"overlay_id":"caption:cuong_hello"}]}]',
    overlay_dynamic_captions: '["old","music"]',
    overlays_v2_config: '{"unknown":{"keep":true}}'
  } } });
  const groups = JSON.parse(result.body.entries.overlay_items);
  const items = groups.flatMap(group => group.items);
  assert.equal(groups.length, 9);
  assert.equal(items.length, 94);
  assert.deepEqual(groups[0].items.map(item => item.caption.text), ["t.me/tomqtx1111", "Bản quyền Cuios", "Cưn🍤", "tom11th5"]);
  assert.deepEqual(groups.map(group => group.items.length), [4, 30, 15, 10, 10, 10, 5, 5, 5]);
  assert.ok(groups.every(group => group.section !== "Dịu dàng"));
  assert.equal(new Set(items.map(item => item.overlay_id)).size, 94);
  assert.ok(items.every(item => !item.overlay_id.startsWith("caption:cuong_")));
  const types = JSON.parse(result.body.entries.overlay_dynamic_captions);
  assert.deepEqual(types, items.map(item => item.overlay_id.slice("caption:".length)));
  assert.deepEqual(JSON.parse(result.body.entries.overlays_v2_config).unknown, { keep: true });
  assert.deepEqual(run({ url: firebase, payload: result.body }).body, result.body);
});

test("diagnostics expose only fixed schema/flag classifications, never response values", () => {
  const entries = {
    camera: '{"private":"never-print-body"}',
    camera_roll: '{"audio_enabled":false}',
    overlay_items: '[{"section":"private-group-name","items":[]}]',
    video_sound_enabled: "false", microphone_enabled: "true",
    mh_mic_enabled_v16: "private-flag-value",
    private_key_name: "private-entry-value"
  };
  const result = run({ url: firebase, payload: { entries } });
  const logs = result.logs.join("\n");
  assert.ok(logs.includes("diag v4.0.5 input schema camera=object camera_roll=object"));
  assert.ok(logs.includes("overlay_items=array(1)"));
  assert.ok(logs.includes("video_sound_enabled=off microphone_enabled=on"));
  assert.ok(logs.includes("mh_mic_enabled_v16=other"));
  for (const secret of ["never-print-body", "private-group-name", "private-flag-value", "private_key_name", "private-entry-value"]) assert.ok(!logs.includes(secret));
});

test("missing media compatibility flags are added without changing 60s or existing types", () => {
  const entries = run({ url: firebase, payload: { entries: {
    camera: '{"microphone_enabled":"false"}',
    camera_roll: '{"enabled":"false"}'
  } } }).body.entries;
  assert.equal(JSON.parse(entries.camera).microphone_enabled, "true");
  assert.equal(JSON.parse(entries.camera).sound_enabled, true);
  assert.equal(JSON.parse(entries.camera).max_duration, 60);
  assert.equal(JSON.parse(entries.camera_roll).enabled, "true");
  assert.equal(JSON.parse(entries.camera_roll).video_upload_enabled, true);
  assert.equal(entries.mh_mic_enabled_v16, "true");
});

test("widget event is opt in, preserves unknown metadata and keeps asset in this repo", () => {
  const event = '{"uid":"original","url":"https://example.test/original.png","extra":{"keep":true}}';
  const payload = { entries: { widget_frame_event: event } };
  assert.equal(run({ url: firebase, payload }).body.entries.widget_frame_event, event);
  const result = run({ url: firebase, payload, argument: "gold-frame" });
  const patched = JSON.parse(result.body.entries.widget_frame_event);
  assert.equal(patched.uid, "cuios_gold_frame_v3");
  assert.deepEqual(patched.extra, { keep: true });
  assert.equal(patched.url, "https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/assets/widget-gold.png?v=4.0.5");
  assert.equal(result.body.entries.video_max_duration, "60.0");
  assert.ok(result.logs.some(line => line.includes("widget=gold-event-experimental")));
  const asset = fs.readFileSync(path.join(root, "assets/widget-gold.png"));
  assert.equal(asset.subarray(1, 4).toString(), "PNG");
  assert.equal(asset.readUInt32BE(16), 1024);
  assert.equal(asset.readUInt32BE(20), 1024);
  assert.equal(asset[25], 6, "RGBA asset required");
  const bad = run({ url: firebase, payload: { entries: { widget_frame_event: "{broken" } }, argument: "gold-frame" });
  assert.equal(bad.body.entries.widget_frame_event, "{broken");
  assert.ok(bad.logs.some(line => line.includes("widget=skipped-schema")));
});

test("explicit catalogue replacement also repairs malformed old caption lists", () => {
  for (const bad of ["{broken", "{}", "null"]) {
    const entries = run({ url: firebase, payload: { entries: { overlay_items: bad, overlay_dynamic_captions: bad } } }).body.entries;
    assert.equal(JSON.parse(entries.overlay_items).flatMap(group => group.items).length, 94);
    assert.equal(JSON.parse(entries.overlay_dynamic_captions).length, 94);
    assert.equal(entries.video_max_duration, "60.0");
  }
});

test("rewritten response avoids stale HTTP caches without dropping unrelated headers", () => {
  const headers = { "Content-Type": "application/json", ETag: "old", "cache-control": "max-age=86400", "Last-Modified": "old", "Content-Length": "10", "X-Signature": "keep", "X-Other": "keep" };
  const result = run({ responseHeaders: headers });
  assert.deepEqual(result.output.headers, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Signature": "keep", "X-Other": "keep" });
  assert.equal(headers.ETag, "old");
  assert.deepEqual(run({ status: 500, responseHeaders: headers }).output, {});
});

test("module URL rules route to the correct handler and exclude unrelated endpoints", () => {
  for (const url of [rc, rc + "?x=1", rc + "/", "https://api.revenuecat.com/v1/receipts", firebase, firebase + "?key=fixture"]) {
    for (const type of ["http-request", "http-response"]) {
      assert.equal(rules.filter(rule => rule.type === type && rule.pattern.test(url)).length, 1, type + " " + url);
    }
    assert.ok(run({ url, payload: url.startsWith("https://firebaseremoteconfig") ? { entries: {} } : { subscriber: {} } }).body);
  }
  for (const url of [rc + "/offerings", firebase.replace("locket-4252a", "other"), "https://api.locketcamera.com/fetchUserV2"]) {
    // Unknown RC endpoints/project IDs are observed by diagnostics, then passed through.
    assert.deepEqual(run({ url }).output, {}, url);
  }
});

function memoryStore() {
  const values = new Map();
  return { values, read(key) { return values.get(key) || null; }, write(value, key) { values.set(key, value); return true; } };
}

function report(store) {
  return JSON.parse(run({ url: "http://cuios-status.invalid/report.json", requestOnly: true, store }).output.response.body);
}

test("Locket identity uses the SDK bundle header even when User-Agent is absent", () => {
  const headers = { "X-CLIENT-BUNDLE-ID": "com.locket.Locket", "X-RevenueCat-ETag": "cached" };
  assert.ok(run({ headers }).body.subscriber.entitlements.Gold);
  assert.deepEqual(run({ headers, requestOnly: true }).output.headers, { "X-CLIENT-BUNDLE-ID": "com.locket.Locket" });
  assert.ok(run({ headers: { "X-Ios-Bundle-Identifier": "com.locket.Locket" } }).body);
  const other = { "X-Client-Bundle-ID": "com.other.App", "User-Agent": "Locket/2.70" };
  assert.deepEqual(run({ headers: other }).output, {});
  assert.deepEqual(run({ headers: other, requestOnly: true }).output, {});
});

test("documented RevenueCat fallback hosts work, lookalike hosts never match", () => {
  for (const host of ["api.revenuecat.com", "api.rc-backup.com", "api-production.8-lives-cat.io"]) {
    const url = rc.replace("api.revenuecat.com", host);
    assert.ok(run({ url, headers: { "X-Client-Bundle-ID": "com.locket.Locket" } }).body);
    assert.equal(rules.filter(rule => rule.type === "http-response" && rule.pattern.test(url)).length, 1);
  }
  assert.deepEqual(run({ url: rc.replace("api.revenuecat.com", "api.rc-backup.com.evil.test") }).output, {});
});

test("Firebase recognizes only Locket project IDs for mutation and observes other routes without mutation", () => {
  const url = firebase.replace("locket-4252a", "869942740286");
  assert.ok(run({ url, payload: { entries: {} } }).body);
  const store = memoryStore();
  assert.deepEqual(run({ url: firebase.replace("locket-4252a", "different-project"), requestOnly: true,
    headers: { "X-Ios-Bundle-Identifier": "com.locket.Locket" }, store }).output, {});
  assert.equal(report(store).observed.firebase.action, "unhandled_project_or_namespace");
  assert.deepEqual(run({ url: firebase, headers: { "X-Ios-Bundle-Identifier": "com.other.App" }, payload: { entries: {} } }).output, {});
});

test("Firebase ETag follows patched content, stays stable across repeat fetches and differs by theme", () => {
  const first = run({ url: firebase, payload: { state: "UPDATE", entries: { camera: '{"max_duration":5}' } }, responseHeaders: { etag: '"server-static"' } });
  const second = run({ url: firebase, payload: first.body, responseHeaders: { ETag: '"server-static"' } });
  assert.match(first.output.headers.etag, /^"cuios-4\.0\.5-/);
  assert.notEqual(first.output.headers.etag, '"server-static"');
  assert.equal(first.output.headers.etag, second.output.headers.etag);
  const gold = run({ url: firebase, payload: first.body, argument: "gold-frame" });
  assert.notEqual(gold.output.headers.etag, first.output.headers.etag);
  assert.equal(first.body.state, "UPDATE");
  assert.equal(second.body.state, "UPDATE");
});

test("activation model reproduces stale-body/same-ETag failure and accepts the rewritten revision", () => {
  // Mirrors the protocol decision in FIRRemoteConfig.activate, not native media behavior.
  const sdk = { etag: '"server-static"', fetched: { seconds: 15 }, active: { seconds: 15 }, fetchedAt: 1, appliedAt: 1, time: 2 };
  function receive(payload, etag) {
    sdk.fetched = payload;
    if (etag !== sdk.etag) { sdk.etag = etag; sdk.fetchedAt = sdk.time++; }
    if (sdk.fetchedAt > sdk.appliedAt) { sdk.active = sdk.fetched; sdk.appliedAt = sdk.time++; }
  }
  receive({ seconds: 30 }, '"server-static"');
  assert.equal(sdk.active.seconds, 15);
  const fresh = run({ url: firebase, payload: { state: "UPDATE", entries: { camera: '{"max_duration":15}' } } });
  receive({ seconds: JSON.parse(fresh.body.entries.camera).max_duration }, fresh.output.headers.etag);
  assert.equal(sdk.active.seconds, 60);
});

test("metadata updates also change the config validator, property order alone does not", () => {
  const a = run({ url: firebase, payload: { state: "UPDATE", entries: {}, personalizationMetadata: { variant: "a", group: "x" } } });
  const reordered = run({ url: firebase, payload: { personalizationMetadata: { group: "x", variant: "a" }, entries: {}, state: "UPDATE" } });
  const changed = run({ url: firebase, payload: { state: "UPDATE", entries: {}, personalizationMetadata: { variant: "b", group: "x" } } });
  assert.equal(a.output.headers.etag, reordered.output.headers.etag);
  assert.notEqual(a.output.headers.etag, changed.output.headers.etag);
});

test("NO_CHANGE without complete entries is reported, never fabricated from old app state", () => {
  const store = memoryStore();
  run({ url: firebase, payload: { state: "UPDATE", entries: {} }, store });
  assert.deepEqual(run({ url: firebase, payload: { state: "NO_CHANGE" }, store }).output, {});
  assert.equal(report(store).observed.firebase.action, "no_entries");
  for (const state of ["NO_TEMPLATE", "EMPTY_CONFIG", "not-a-real-state"]) {
    assert.deepEqual(run({ url: firebase, payload: { state, entries: {} }, store }).output, {});
  }
});

test("local status proves runtime execution but never claims native features or activation were verified", () => {
  const store = memoryStore();
  const before = report(store);
  assert.equal(before.runtime, "4.0.5");
  assert.deepEqual(before.observed, {});
  assert.equal(before.deviceFeaturesVerified, false);
  assert.equal(before.recipe.seconds, 60);
  const html = run({ url: "http://cuios-status.invalid/status", requestOnly: true, store }).output.response;
  assert.equal(html.status, 200);
  assert.ok(html.body.includes("Chưa quan sát thấy request"));
  assert.equal(html.headers["Cache-Control"], "no-store");
  assert.ok(html.headers["Content-Security-Policy"].includes("default-src 'none'"));
  assert.equal(run({ url: "http://cuios-status.invalid/status", requestOnly: true, method: "POST", store }).output.response.status, 405);
  assert.equal(run({ url: "http://cuios-status.invalid/status", requestOnly: true, method: "HEAD", store }).output.response.body, "");
});

test("diagnostic service records survive interleaved requests and redact private inputs", () => {
  const store = memoryStore();
  run({ requestOnly: true, headers: { "X-Client-Bundle-ID": "com.locket.Locket", Authorization: "secret-auth-fixture" }, store });
  run({ url: firebase, payload: { state: "UPDATE", entries: { private: "secret-config-value", camera: '{"private":"secret-inner-value"}' } }, store });
  run({ url: rc.replace("test-user", "secret-account-id"), store });
  const state = report(store);
  assert.equal(state.observed.firebase.action, "patched");
  assert.equal(state.observed.revenuecat.action, "patched");
  assert.equal(state.observed.firebase.sentCaptions, 94);
  assert.equal(state.observed.firebase.sentETag, run({ url: firebase, payload: { state: "UPDATE", entries: { private: "secret-config-value", camera: '{"private":"secret-inner-value"}' } } }).output.headers.etag);
  const serialized = JSON.stringify([...store.values]);
  for (const value of ["secret-auth-fixture", "secret-config-value", "secret-inner-value", "secret-account-id"]) assert.ok(!serialized.includes(value));
  assert.ok(store.values.has("CUIOS_STABLE_V4_DIAGNOSTICS_firebase"));
  assert.ok(store.values.has("CUIOS_STABLE_V4_DIAGNOSTICS_revenuecat"));
});

test("HTTP errors and unsupported format have distinct status; unknown schemas remain partial", () => {
  const store = memoryStore();
  run({ url: firebase, status: 403, store });
  assert.equal(report(store).observed.firebase.action, "http_error");
  run({ body: "binary-format-fixture", store });
  assert.equal(report(store).observed.revenuecat.action, "invalid_json_or_unsupported_format");
  run({ url: firebase, payload: { state: "UPDATE", entries: { camera: "{broken" } }, store });
  assert.equal(report(store).observed.firebase.action, "partial");
  assert.ok(report(store).observed.firebase.warnings.includes("camera"));
});

test("missing, throwing or corrupt persistent storage cannot break app requests", () => {
  const throwing = { read() { throw Error("no storage"); }, write() { throw Error("no storage"); } };
  assert.ok(run({ url: firebase, payload: { state: "UPDATE", entries: {} }, store: throwing }).body);
  assert.equal(report(throwing).storageAvailable, false);
  const store = memoryStore();
  store.values.set("CUIOS_STABLE_V4_DIAGNOSTICS_firebase", '{"schema":1,"data":{"at":"broken"}}');
  assert.equal(run({ url: "http://cuios-status.invalid/status", requestOnly: true, store }).output.response.status, 200);
  assert.ok(run({ url: firebase, payload: { state: "UPDATE", entries: {} } }).body);
});

test("media diagnostics reveal flag names/types needed for compatibility without their private string values", () => {
  const store = memoryStore();
  run({ url: firebase, payload: { state: "UPDATE", entries: {
    camera: JSON.stringify({ recordAudio: false, microphone_token: "never-save-this", audioCodec: "private-codec-string", private_sound: "never-save-either" })
  } }, store });
  const fields = report(store).observed.firebase.inputMediaFields;
  assert.ok(fields.some(field => field.field === "recordAudio" && field.flag === "off"));
  assert.ok(fields.some(field => field.field === "audioCodec" && field.type === "unparsed-string"));
  const saved = JSON.stringify([...store.values]);
  for (const token of ["never-save-this", "private-codec-string", "never-save-either", "microphone_token", "private_sound"]) assert.ok(!saved.includes(token));
});

test("the complete profile references a single content-addressed runtime and no old modules", () => {
  const crypto = require("node:crypto");
  const published = fs.readFileSync(path.join(root, release.runtime));
  assert.equal(published.toString(), source);
  assert.equal(crypto.createHash("sha256").update(published).digest("hex"), release.sha256);
  assert.equal(release.version, require("../package.json").version);
  assert.ok(source.includes('var VERSION = "' + release.version + '";'));
  for (const name of ["locket_cuios_stable.sgmodule", "locket_cuios_no_widget.sgmodule"]) {
    const text = fs.readFileSync(path.join(root, name), "utf8");
    const paths = [...text.matchAll(/script-path=([^,\n]+)/g)].map(match => match[1]);
    assert.equal(paths.length, 5);
    assert.equal(new Set(paths).size, 1);
    assert.ok(paths[0].endsWith(release.runtime));
    assert.ok(text.includes("api.rc-backup.com"));
    assert.ok(text.includes("cuios-status.invalid = 198.18.0.1"));
    assert.equal(rules.filter(rule => rule.type === "http-request" && rule.pattern.test("http://cuios-status.invalid/status")).length, 1);
  }
});

test("HTTPS self-check is local and records browser transport separately from actual Locket traffic", () => {
  const store = memoryStore();
  for (const host of ["api.revenuecat.com", "firebaseremoteconfig.googleapis.com"]) {
    const url = "https://" + host + "/cuios-check";
    assert.equal(rules.filter(rule => rule.type === "http-request" && rule.pattern.test(url)).length, 1);
    const result = run({ url, requestOnly: true, store });
    assert.equal(result.output.response.status, 200);
    assert.ok(result.output.response.body.includes("Cuios · HTTPS check v4.0.5"));
  }
  const state = report(store).observed;
  assert.equal(state.https_firebase.action, "https_hook_seen");
  assert.equal(state.https_revenuecat.action, "https_hook_seen");
  assert.equal(state.firebase, undefined);
  assert.equal(state.revenuecat, undefined);
});

test("a library config capped at 10s and 6 MiB becomes 60s and 100 MiB across media profiles", () => {
  const input = { entries: {
    camera_roll: JSON.stringify({
      max_duration: 10, max_file_size: 6291456, fps: 30,
      gold: { max_duration: 10, max_size_bytes: "6291456", max_size_mb: 6, audio: { remove_audio: true } },
      free: { max_duration_ms: 10000, max_upload_bytes: 6291456 },
      upload: { limits: { maximum_duration: 10, max_file_size_bytes: 6291456 } },
      custom: { max_duration: 10, max_file_size: 6291456 }
    }),
    max_upload_bytes: "6291456", max_file_size: "6291456", max_file_size_mb: "6",
    image_cache_max_size: "6291456", storage_bucket_video: "gs://keep-video",
    video_upload_config: '{"max_duration":10,"max_upload_bytes":6291456,"codec":"h264"}'
  } };
  const result = run({ url: firebase, payload: input });
  const entries = result.body.entries;
  const roll = JSON.parse(entries.camera_roll);
  assert.equal(roll.max_duration, 60);
  assert.equal(roll.max_file_size, 104857600);
  assert.equal(roll.gold.max_duration, 60);
  assert.equal(roll.gold.max_size_bytes, "104857600");
  assert.equal(roll.gold.max_size_mb, 100);
  assert.equal(roll.gold.audio.remove_audio, false);
  assert.equal(roll.free.max_duration_ms, 60000);
  assert.equal(roll.free.max_upload_bytes, 104857600);
  assert.equal(roll.upload.limits.maximum_duration, 60);
  assert.equal(roll.upload.limits.max_file_size_bytes, 104857600);
  assert.deepEqual(roll.custom, { max_duration: 10, max_file_size: 6291456 });
  assert.equal(roll.fps, 30);
  assert.equal(entries.max_file_size, "104857600");
  assert.equal(entries.max_file_size_mb, "100");
  assert.equal(entries.image_cache_max_size, "6291456");
  assert.equal(entries.storage_bucket_video, "gs://keep-video");
  assert.deepEqual(JSON.parse(entries.video_upload_config), { max_duration: 60, max_upload_bytes: 104857600, codec: "h264" });
  assert.ok(result.logs.some(line => line.includes('"max_file_size":6291456')));
  assert.ok(result.logs.some(line => line.includes("upload-bytes=104857600; captions=94")));
});

test("all caption backgrounds resolve to local PNG assets and include fallback colors", () => {
  const entries = run({ url: firebase, payload: { entries: {} } }).body.entries;
  const items = JSON.parse(entries.overlay_items).flatMap(group => group.items);
  const uniqueAssets = new Set();
  for (const item of items) {
    const background = item.caption.background;
    assert.equal(background.colors.length, 2);
    assert.ok(background.colors.every(color => /^#[0-9A-F]{6}$/.test(color)));
    const url = new URL(background.image.data);
    assert.equal(url.hostname, "raw.githubusercontent.com");
    assert.ok(url.pathname.startsWith("/Cuios-shop/locket_cuios_stable/main/assets/captions/"));
    const file = url.pathname.split("/main/")[1];
    assert.ok(fs.existsSync(path.join(root, file)), file);
    uniqueAssets.add(file);
  }
  assert.equal(uniqueAssets.size, 91);
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, "content/captions.json"), "utf8"));
  assert.deepEqual(items.map(item => item.caption.text), catalogue.flatMap(group => group.items.map(item => item[1])));
});

test("posted moments and profile APIs are never rewritten by the new catalogue or upload limits", () => {
  const payload = { data: { caption: "old posted caption", video: { duration: 10, bytes: 6291456 } } };
  for (const url of ["https://api.locketcamera.com/getLatestMomentV2", "https://firebasestorage.googleapis.com/v0/b/locket-video/o", "https://api.locketcamera.com/postMomentV2"]) {
    assert.deepEqual(run({ url, payload }).output, {});
  }
});

test("Looks changes only three filter fields and keeps server filter catalogues, safety and media", () => {
  const config = {
    show_filter_button: false, sheet_enabled: false, allows_custom_filters: false,
    open_sheet_immediately: false, custom_prompt: "private-user-prompt",
    sheet_filters: [{ title: { en: "Server group" }, filter_ids: ["server-filter"] }],
    picker_filters: ["server-filter"], safety: { moderation: true }, daily_limit: 2,
    model: "server-model", endpoint: "https://example.invalid/server-only"
  };
  for (const value of [config, JSON.stringify(config)]) {
    const options = { url: firebase, payload: { state: "UPDATE", entries: {
      camera_filter_config: value, untouched: "keep", camera: '{"max_duration":3}'
    } } };
    const baseline = run({ ...options, argument: "aura-frame" });
    const enabled = run({ ...options, argument: "looks-aura-frame" });
    assert.deepEqual(JSON.parse(enabled.body.entries.camera_filter_config), {
      ...config, show_filter_button: true, sheet_enabled: true, allows_custom_filters: true
    });
    const withoutFilters = body => {
      const clone = structuredClone(body);
      for (const key of ["camera_filter_config", "overlay_items", "overlay_dynamic_captions",
        "overlays_v2_config", "captions_enabled", "overlay_navigator_enabled", "music_caption_enabled",
        "music_caption_song_preview_enabled", "link_caption_link_enabled"]) delete clone.entries[key];
      return clone;
    };
    assert.deepEqual(withoutFilters(enabled.body), withoutFilters(baseline.body));
    assert.ok(!enabled.logs.join("\n").includes("private-user-prompt"));
  }
});

test("Looks can supply the observed UI flags without fabricating a catalogue or backend", () => {
  const result = run({ url: firebase, argument: "looks-aura-frame", payload: { entries: {} } });
  assert.deepEqual(JSON.parse(result.body.entries.camera_filter_config), {
    show_filter_button: true, sheet_enabled: true, allows_custom_filters: true
  });
  assert.equal(JSON.parse(result.body.entries.camera).max_duration, 60);
  assert.equal(JSON.parse(result.body.entries.camera_roll).max_upload_bytes, 104857600);
  assert.equal(Object.hasOwn(result.body.entries, "overlay_items"), false);
  assert.equal(Object.hasOwn(result.body.entries, "overlay_dynamic_captions"), false);
});

test("Looks is opt-in and does not alter filter data in the regular modules", () => {
  for (const argument of [undefined, "aura-frame", "gold-frame", "looks-aura-frame-extra"]) {
    const options = { url: firebase, argument, payload: { entries: {} } };
    assert.equal(Object.hasOwn(run(options).body.entries, "camera_filter_config"), false);
  }
  const config = '{ "sheet_enabled": false, "server_field": 1 }';
  assert.equal(run({ url: firebase, argument: "aura-frame", payload: { entries: {
    camera_filter_config: config
  } } }).body.entries.camera_filter_config, config);
});

test("Looks preserves malformed and incompatible config and reports partial patching", () => {
  for (const value of ["{broken", "[]", "null", "true", [], null, 7]) {
    const store = memoryStore();
    const result = run({ url: firebase, argument: "looks-aura-frame", store,
      payload: { entries: { camera_filter_config: value } } });
    assert.deepEqual(result.body.entries.camera_filter_config, value);
    const data = report(store).observed.firebase;
    assert.equal(data.action, "partial");
    assert.ok(data.warnings.includes("camera_filter_config"));
    assert.equal(data.looks.action, "skipped_schema");
    assert.equal(data.looks.generationVerified, false);
  }
});

test("Looks diagnostics classify flags and counts without saving prompts, models, URLs or IDs", () => {
  const store = memoryStore();
  run({ url: firebase, argument: "looks-aura-frame", store, payload: { entries: {
    camera_filter_config: JSON.stringify({ show_filter_button: false, sheet_enabled: true,
      allows_custom_filters: "private-flag-value", prompt: "never-save-prompt",
      model: "never-save-model", endpoint: "https://example.invalid/never-save-url",
      picker_filters: ["never-save-id"], sheet_filters: [{ private_data: "never-save-data" }] })
  } } });
  const details = report(store).observed.firebase.looks;
  assert.deepEqual(details.inputFlags, {
    show_filter_button: "off", sheet_enabled: "on", allows_custom_filters: "other"
  });
  assert.equal(details.serverConfigPresent, true);
  assert.equal(details.pickerFilters, 1);
  assert.equal(details.sheetGroups, 1);
  assert.equal(details.action, "configuration_patched");
  assert.equal(details.generationVerified, false);
  const saved = JSON.stringify([...store.values]);
  for (const value of ["never-save-", "private-flag-value"]) assert.ok(!saved.includes(value));
  run({ url: firebase, argument: "aura-frame", store, payload: { entries: {} } });
  assert.deepEqual(report(store).observed.firebase.looks, {
    requested: false, action: "not_requested", generationVerified: false
  });
});

test("Looks changes the validator only when output changes and is idempotent", () => {
  const options = { url: firebase, payload: { entries: {} } };
  const regular = run({ ...options, argument: "aura-frame" });
  const enabled = run({ ...options, argument: "looks-aura-frame" });
  const repeated = run({ ...options, argument: "looks-aura-frame", payload: enabled.body });
  assert.notEqual(enabled.output.headers.etag, regular.output.headers.etag);
  assert.deepEqual(repeated.body, enabled.body);
  assert.equal(repeated.output.headers.etag, enabled.output.headers.etag);
});

test("Looks cannot fabricate NO_CHANGE entries or rewrite other apps, errors or AI endpoints", () => {
  const options = { url: firebase, argument: "looks-aura-frame", payload: { entries: {} } };
  for (const overrides of [
    { payload: { state: "NO_CHANGE" } }, { status: 403 }, { status: 429 },
    { url: firebase.replace("locket-4252a", "another-project") },
    { headers: { "X-Ios-Bundle-Identifier": "com.other.App" } },
    { url: "https://api.locketcamera.com/generateImage" },
    { url: "https://generativelanguage.googleapis.com/v1beta/models/example:generateContent" }
  ]) assert.deepEqual(run({ ...options, ...overrides }).output, {});
});

test("Looks module enables the experiment only on the existing Firebase response hook", () => {
  const regular = fs.readFileSync(path.join(root, "locket_cuios_stable.sgmodule"), "utf8");
  const experiment = fs.readFileSync(path.join(root, "locket_cuios_looks.sgmodule"), "utf8");
  const operational = text => text.split("\n").filter(line => !line.startsWith("#!"));
  assert.deepEqual(operational(experiment.replace("argument=looks-aura-frame", "argument=aura-frame")), operational(regular));
  assert.equal((experiment.match(/argument=looks-aura-frame/g) || []).length, 1);
  assert.ok(experiment.includes("chưa xác nhận tạo ảnh AI"));
});

function nativeOverlayFixture() {
  // Synthetic AI item: tests preservation of an unknown type, not a real API ID.
  return {
    overlay_items: JSON.stringify([{ section: "Native", layout: { future: true }, items: [
      { overlay_id: "caption:standard", source: "local", caption: { type: "standard" } },
      { overlay_id: "filter:fixture_ai", source: "fixture", custom_field: { required: true } },
      { overlay_id: "caption:music", source: "local", caption: { type: "music" } }
    ] }, { section: "Empty native section", items: [], future: 7 }]),
    overlay_dynamic_captions: JSON.stringify(["standard", "music", "fixture_ai", { future: "opaque" }]),
    captions_enabled: "false", overlay_navigator_enabled: "false", music_caption_enabled: "false",
    music_caption_song_preview_enabled: "false", link_caption_link_enabled: "false",
    overlays_v2_config: '{ "suggestions_enabled": false, "native_layout": {"future":true} }'
  };
}

test("regression: v4.0.4 drops native AI-like entries but Looks now preserves them before custom notes", () => {
  const entries = nativeOverlayFixture();
  const options = { url: firebase, argument: "looks-aura-frame", payload: { entries } };
  const previous = fs.readFileSync(path.join(root, "scripts/releases/locket-v4.0.4-9e969abd0ee5.js"), "utf8");
  const broken = JSON.parse(run(options, previous).body.entries.overlay_items);
  assert.ok(!broken.flatMap(group => group.items).some(item => item.overlay_id === "filter:fixture_ai"));
  const store = memoryStore();
  const fixed = run({ ...options, store }).body.entries;
  const groups = JSON.parse(fixed.overlay_items);
  assert.deepEqual(groups.slice(0, 2), JSON.parse(entries.overlay_items));
  assert.equal(groups.slice(2).flatMap(group => group.items).length, 94);
  assert.equal(groups[2].items[0].caption.text, "t.me/tomqtx1111");
  assert.deepEqual(JSON.parse(fixed.overlay_dynamic_captions).slice(0, 4), JSON.parse(entries.overlay_dynamic_captions));
  for (const key of Object.keys(entries).filter(key => !["overlay_items", "overlay_dynamic_captions"].includes(key))) {
    assert.equal(fixed[key], entries[key], key);
  }
  assert.deepEqual(report(store).observed.firebase.overlays, {
    mode: "merge", inputGroups: 2, inputDynamicTypes: 4, addedCaptions: 94, action: "merged"
  });
});

test("Looks merging is idempotent and replaces only exact Cuios IDs in mixed native groups", () => {
  const entries = nativeOverlayFixture();
  const options = { url: firebase, argument: "looks-aura-frame", payload: { entries } };
  const first = run(options);
  const again = run({ ...options, payload: first.body });
  assert.deepEqual(again.body, first.body);
  assert.equal(again.output.headers.etag, first.output.headers.etag);
  const groups = JSON.parse(first.body.entries.overlay_items);
  const custom = groups[2].items[0];
  const mixed = { section: "Mixed", metadata: "preserve", items: [
    custom, { overlay_id: "caption:cuios_future_native", caption: { type: "future" } },
    { overlay_id: "caption:music", source: "local" }, null
  ] };
  const fixed = run({ ...options, payload: { entries: {
    ...entries, overlay_items: JSON.stringify([mixed]),
    overlay_dynamic_captions: JSON.stringify([custom.overlay_id.slice(8), "music", "cuios_future_native"])
  } } }).body.entries;
  const after = JSON.parse(fixed.overlay_items);
  assert.deepEqual(after[0], { ...mixed, items: mixed.items.slice(1) });
  assert.equal(after.flatMap(group => group.items).filter(item => item && item.overlay_id === custom.overlay_id).length, 1);
  const types = JSON.parse(fixed.overlay_dynamic_captions);
  assert.deepEqual(types.slice(0, 2), ["music", "cuios_future_native"]);
  assert.equal(types.filter(type => type === custom.overlay_id.slice(8)).length, 1);
});

test("Looks preserves native list metadata and opaque items from both object and string entries", () => {
  for (const asString of [false, true]) {
    const groups = [{ section: "Native", future_metadata: { revision: 2 }, items: [
      { overlay_id: "future:opaque", payload: { nested: [1, 2] } }, "future-item", 9
    ] }];
    const types = ["future", { future_type: [1, 2] }, 9];
    const result = run({ url: firebase, argument: "looks-aura-frame", payload: { entries: {
      overlay_items: asString ? JSON.stringify(groups) : groups,
      overlay_dynamic_captions: asString ? JSON.stringify(types) : types
    } } });
    assert.deepEqual(JSON.parse(result.body.entries.overlay_items)[0], groups[0]);
    assert.deepEqual(JSON.parse(result.body.entries.overlay_dynamic_captions).slice(0, 3), types);
  }
});

test("Looks preserves both overlay entries atomically when either schema is unrecognized", () => {
  for (const bad of ["{broken", '{"groups":[]}', "null", "7", '[{"section":"future"}]']) {
    const entries = { ...nativeOverlayFixture(), overlay_items: bad };
    const store = memoryStore();
    const result = run({ url: firebase, argument: "looks-aura-frame", store, payload: { entries } });
    for (const key of Object.keys(entries)) assert.deepEqual(result.body.entries[key], entries[key], key);
    const data = report(store).observed.firebase;
    assert.equal(data.overlays.action, "skipped_schema");
    assert.equal(data.sentCaptions, 0);
    assert.ok(data.warnings.includes("overlay_items"));
  }
  const entries = { ...nativeOverlayFixture(), overlay_dynamic_captions: '{"future":[]}' };
  const result = run({ url: firebase, argument: "looks-aura-frame", payload: { entries } });
  for (const key of Object.keys(entries)) assert.deepEqual(result.body.entries[key], entries[key], key);
});

test("Looks keeps missing catalogue keys absent so native app defaults can remain active", () => {
  for (const missing of [["overlay_items"], ["overlay_dynamic_captions"], ["overlay_items", "overlay_dynamic_captions"]]) {
    const entries = nativeOverlayFixture();
    for (const key of missing) delete entries[key];
    const store = memoryStore();
    const result = run({ url: firebase, argument: "looks-aura-frame", store, payload: { entries } });
    for (const key of Object.keys(entries)) assert.deepEqual(result.body.entries[key], entries[key], key);
    for (const key of missing) assert.equal(Object.hasOwn(result.body.entries, key), false);
    assert.equal(report(store).observed.firebase.overlays.action, "missing_catalogue_preserved");
    assert.equal(report(store).observed.firebase.sentCaptions, 0);
  }
});

test("Looks native mode preserves every caption entry and widget frame while keeping media and filter flags", () => {
  for (const overlay_items of [nativeOverlayFixture().overlay_items, '{"future_layout":"opaque"}', "{broken"]) {
    const entries = { ...nativeOverlayFixture(), overlay_items,
      widget_frame_event: '{ "uid": "server-frame", "unknown": true }' };
    const store = memoryStore();
    const result = run({ url: firebase, argument: "looks-native", store, payload: { entries } });
    for (const key of Object.keys(entries)) assert.deepEqual(result.body.entries[key], entries[key], key);
    assert.equal(JSON.parse(result.body.entries.camera).max_duration, 60);
    assert.equal(JSON.parse(result.body.entries.camera_roll).max_upload_bytes, 104857600);
    assert.equal(JSON.parse(result.body.entries.camera_filter_config).show_filter_button, true);
    const data = report(store).observed.firebase;
    assert.equal(data.looks.requested, true);
    assert.equal(data.looks.generationVerified, false);
    assert.deepEqual(data.overlays, { mode: "native", action: "native_preserved", addedCaptions: 0 });
    assert.equal(data.sentCaptions, 0);
    assert.equal(data.widget, "off");
  }
  const empty = run({ url: firebase, argument: "looks-native", payload: { entries: {} } }).body.entries;
  for (const key of Object.keys(nativeOverlayFixture()).concat("widget_frame_event")) assert.equal(Object.hasOwn(empty, key), false);
});

test("ordinary profile preserves the previous release behavior for complete native input", () => {
  const previous = fs.readFileSync(path.join(root, "scripts/releases/locket-v4.0.4-9e969abd0ee5.js"), "utf8");
  const options = { url: firebase, argument: "aura-frame", payload: { entries: {
    ...nativeOverlayFixture(), camera: '{"max_duration":3,"audio":{"enabled":false}}',
    camera_roll: '{"max_duration":10,"max_upload_bytes":6291456}', camera_filter_config: '{"sheet_enabled":false}'
  } } };
  const before = run(options, previous).body;
  const after = run(options).body;
  before.entries.widget_frame_event = before.entries.widget_frame_event.replace("?v=4.0.4", "?v=4.0.5");
  assert.deepEqual(after, before);
});

test("native Looks module uses the same hooks and enables its mode only on Firebase response", () => {
  const regular = fs.readFileSync(path.join(root, "locket_cuios_stable.sgmodule"), "utf8");
  const native = fs.readFileSync(path.join(root, "locket_cuios_looks_native.sgmodule"), "utf8");
  const operational = text => text.split("\n").filter(line => !line.startsWith("#!"));
  assert.deepEqual(operational(native.replace("argument=looks-native", "argument=aura-frame")), operational(regular));
  assert.equal((native.match(/argument=looks-native/g) || []).length, 1);
  assert.ok(native.includes("Không chèn ghi chú Cuios"));
});

test("the working v4.0.0 engine is identical outside captions, opt-in Looks and release labels", () => {
  const previous = fs.readFileSync(path.join(root, "scripts/releases/locket-v4.0.0-fddb9e4d0469.js"), "utf8");
  function withoutCatalogue(text) {
    return text.replace(/  \/\/ BEGIN GENERATED CAPTION CATALOGUE[\s\S]*?  \/\/ END GENERATED CAPTION CATALOGUE/, "// CATALOGUE")
      .replace(/  function looksPatch\(entries\) \{[\s\S]*?(?=  function widgetPatch)/, "")
      .replace('    if (mode === "looks-aura-frame") mode = "aura-frame";\n', "")
      .replace("    looksPatch(entries);\n", "")
      .replace("    var added = overlayPatch(entries);", '    mergeEntry(entries, "overlays_v2_config", { suggestions_enabled: true });\n    var added = captionPatch(entries);')
      .replace('      custom_widget_frames_enabled: "true",\n      profile_badge_visible:',
        '      custom_widget_frames_enabled: "true",\n      captions_enabled: "true",\n      overlay_navigator_enabled: "true",\n      music_caption_enabled: "true",\n      music_caption_song_preview_enabled: "true",\n      link_caption_link_enabled: "true",\n      profile_badge_visible:')
      .replace(/  function captionPatch\([^)]*\) \{[\s\S]*?(?=  function widgetPatch)/, "// CAPTION STYLING\n\n");
  }
  const normalized = withoutCatalogue(source)
    .replaceAll("4.0.5", "4.0.0")
    .replaceAll("https://raw.githubusercontent.com/Cuios-shop/", "https://raw.githubusercontent.com/Cuongqtx11/")
    .replace("captions: 94", "captions: 54")
    .replace("· 94 ghi chú.", "· 54 ghi chú.");
  assert.equal(normalized, withoutCatalogue(previous));
});

test("the four branded caption objects remain exactly as in v4.0.1", () => {
  const crypto = require("node:crypto");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "assets/captions/brand.png"))).digest("hex"),
    "3b70185c37114626ec36f2e82a4625d57264850ae28c6c19730d553299b9de59");
  const previous = fs.readFileSync(path.join(root, "scripts/releases/locket-v4.0.1-dc3e621cce8f.js"), "utf8");
  const options = { url: firebase, payload: { entries: {} } };
  const before = JSON.parse(run(options, previous).body.entries.overlay_items);
  const after = JSON.parse(run(options).body.entries.overlay_items);
  // Only the repository owner in the asset URL changes during the Organization transfer.
  for (const item of before[0].items) {
    item.caption.background.image.data = item.caption.background.image.data.replace("/Cuongqtx11/", "/Cuios-shop/");
  }
  assert.deepEqual(after[0], before[0]);
  const unchangedContent = groups => groups.flatMap(group => group.items).map(item => {
    const copy = structuredClone(item);
    delete copy.caption.background;
    return copy;
  });
  assert.deepEqual(unchangedContent(after), unchangedContent(before));
});

test("all 90 ordinary captions use unique published textures and diverse styles within each group", () => {
  const crypto = require("node:crypto");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "content/caption_backgrounds.json"), "utf8"));
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, "content/captions.json"), "utf8"));
  const entries = run({ url: firebase, payload: { entries: {} } }).body.entries;
  const items = JSON.parse(entries.overlay_items).slice(1).flatMap(group => group.items);
  assert.equal(manifest.items.length, 90);
  assert.equal(new Set(manifest.items.map(item => item.image)).size, 90);
  assert.equal(new Set(manifest.items.map(item => item.sha256)).size, 90);
  assert.equal(new Set(manifest.items.map(item => item.style)).size, 12);
  assert.ok(new Set(manifest.items.map(item => JSON.stringify(item.colors))).size >= 40);
  for (const group of catalogue.slice(1)) {
    assert.ok(new Set(group.items.map(item => item[3].style)).size >= 3, group.section);
  }
  for (const item of manifest.items) {
    const asset = fs.readFileSync(path.join(root, "assets", item.image));
    assert.equal(crypto.createHash("sha256").update(asset).digest("hex"), item.sha256);
    assert.equal(asset.subarray(1, 4).toString(), "PNG");
    assert.equal(asset.readUInt32BE(16), 768);
    assert.equal(asset.readUInt32BE(20), 256);
    const caption = items.find(caption => caption.overlay_id === "caption:" + item.id);
    assert.ok(caption.caption.background.image.data.endsWith("/assets/" + item.image));
    assert.deepEqual(caption.caption.background.colors, item.colors);
  }
  assert.ok(manifest.items.reduce((bytes, item) => bytes + item.bytes, 0) < 5 * 1024 * 1024);
});
