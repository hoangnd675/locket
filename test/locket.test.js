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
    assert.equal(rule.url, "https://raw.githubusercontent.com/Cuios-shop/locket_cuios_10s_6mb/main/" + release.runtime);
    assert.ok(fs.existsSync(path.join(root, "scripts/locket.js")));
  }
  assert.ok(!moduleText.includes("cloudfunctions"));
});

test("recording stays at 60 seconds while library selection and trimming use 10 seconds", () => {
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
      if (/duration|Duration/.test(field)) assert.equal(value, key === "camera" ? 60 : 10, key + "." + field);
    }
  }
  for (const [key, value] of Object.entries(entries)) {
    if (/duration/i.test(key)) assert.equal(value, /camera_roll|trim|upload/i.test(key) ? "10.0" : "60.0", key);
  }
  for (const key of ["camera_roll_preview_enabled", "camera_roll_video_enabled", "camera_roll_video_upload_enabled", "internal_camera_roll_video_upload_enabled"]) {
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
  assert.equal(config.max_upload_bytes, 6291456);
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

test("54 replacement captions have branded ordering and leave native renderer names available", () => {
  const result = run({ url: firebase, payload: { entries: {
    overlay_items: '[{"section":"old","items":[{"overlay_id":"caption:cuong_hello"}]}]',
    overlay_dynamic_captions: '["old","music"]',
    overlays_v2_config: '{"unknown":{"keep":true}}'
  } } });
  const groups = JSON.parse(result.body.entries.overlay_items);
  const items = groups.flatMap(group => group.items);
  assert.equal(groups.length, 6);
  assert.equal(items.length, 54);
  assert.deepEqual(groups[0].items.map(item => item.caption.text), ["mua chứng chỉ Cuios.shop", "Bản quyền Cuios", "Cưn🍤", "tom11th5"]);
  assert.ok(groups.slice(1).every(group => group.items.length === 10));
  assert.equal(new Set(items.map(item => item.overlay_id)).size, 54);
  assert.ok(items.every(item => !item.overlay_id.startsWith("caption:cuong_")));
  const types = JSON.parse(result.body.entries.overlay_dynamic_captions);
  assert.deepEqual(types, ["standard", "old", "music"]);
  assert.ok(types.every(type => !type.startsWith("cuios_")));
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
  assert.ok(logs.includes("diag v4.1.1 input schema camera=object camera_roll=object"));
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
  assert.equal(patched.url, "https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/assets/widget-gold.png?v=4.1.1");
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
    assert.equal(JSON.parse(entries.overlay_items).flatMap(group => group.items).length, 54);
    assert.ok(JSON.parse(entries.overlay_dynamic_captions).includes("standard"));
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
  assert.match(first.output.headers.etag, /^"cuios-4\.1\.1-/);
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
  assert.equal(before.runtime, "4.1.1");
  assert.deepEqual(before.observed, {});
  assert.equal(before.deviceFeaturesVerified, false);
  assert.deepEqual(before.recipe, { recordingSeconds: 60, uploadSeconds: 10, uploadBytes: 6291456, captions: 54 });
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
  assert.equal(state.observed.firebase.sentCaptions, 54);
  assert.equal(state.observed.firebase.sentETag, run({ url: firebase, payload: { state: "UPDATE", entries: { private: "secret-config-value", camera: '{"private":"secret-inner-value"}' } } }).output.headers.etag);
  const serialized = JSON.stringify([...store.values]);
  for (const value of ["secret-auth-fixture", "secret-config-value", "secret-inner-value", "secret-account-id"]) assert.ok(!serialized.includes(value));
  assert.ok(store.values.has("CUIOS_4_1_DIAGNOSTICS_firebase"));
  assert.ok(store.values.has("CUIOS_4_1_DIAGNOSTICS_revenuecat"));
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
  store.values.set("CUIOS_4_1_DIAGNOSTICS_firebase", '{"schema":1,"data":{"at":"broken"}}');
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
  for (const name of ["locket60s_10s_6mb.sgmodule", "locket_cuios_stable.sgmodule", "locket_cuios_no_widget.sgmodule"]) {
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
    assert.ok(result.output.response.body.includes("Cuios · HTTPS check v4.1.1"));
  }
  const state = report(store).observed;
  assert.equal(state.https_firebase.action, "https_hook_seen");
  assert.equal(state.https_revenuecat.action, "https_hook_seen");
  assert.equal(state.firebase, undefined);
  assert.equal(state.revenuecat, undefined);
});

test("library configuration stays at 10s and 6 MiB while keeping unrelated image and storage settings", () => {
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
  assert.equal(roll.max_duration, 10);
  assert.equal(roll.max_file_size, 6291456);
  assert.equal(roll.gold.max_duration, 10);
  assert.equal(roll.gold.max_size_bytes, "6291456");
  assert.equal(roll.gold.max_size_mb, 6);
  assert.equal(roll.gold.audio.remove_audio, false);
  assert.equal(roll.free.max_duration_ms, 10000);
  assert.equal(roll.free.max_upload_bytes, 6291456);
  assert.equal(roll.upload.limits.maximum_duration, 10);
  assert.equal(roll.upload.limits.max_file_size_bytes, 6291456);
  assert.deepEqual(roll.custom, { max_duration: 10, max_file_size: 6291456 });
  assert.equal(roll.fps, 30);
  assert.equal(entries.max_file_size, "6291456");
  assert.equal(entries.max_file_size_mb, "6");
  assert.equal(entries.image_cache_max_size, "6291456");
  assert.equal(entries.storage_bucket_video, "gs://keep-video");
  assert.deepEqual(JSON.parse(entries.video_upload_config), { max_duration: 10, max_upload_bytes: 6291456, codec: "h264" });
  assert.ok(result.logs.some(line => line.includes('"max_file_size":6291456')));
  assert.ok(result.logs.some(line => line.includes("upload-bytes=6291456; captions=54")));
});

test("all caption backgrounds resolve to local PNG assets and include fallback colors", () => {
  const entries = run({ url: firebase, payload: { entries: {} }, argument: "aura-frame" }).body.entries;
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
  assert.equal(uniqueAssets.size, 11);
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, "content/captions.json"), "utf8"));
  assert.deepEqual(items.map(item => item.caption.text), catalogue.flatMap(group => group.items.map(item => item[1])));
});

test("posted moments and profile APIs are never rewritten by the new catalogue or upload limits", () => {
  const payload = { data: { caption: "old posted caption", video: { duration: 10, bytes: 6291456 } } };
  for (const url of ["https://api.locketcamera.com/getLatestMomentV2", "https://firebasestorage.googleapis.com/v0/b/locket-video/o", "https://api.locketcamera.com/postMomentV2"]) {
    assert.deepEqual(run({ url, payload }).output, {});
  }
});

test("mixed capture/upload schemas do not let library limits shorten recording or limit its byte budget", () => {
  const entries = run({ url: firebase, payload: { entries: {
    camera: JSON.stringify({ max_duration: "3", max_file_size: 50000000,
      upload: { max_duration: "60", max_file_size: "104857600" },
      video: { audio: { enabled: "false", strip_audio: true } } }),
    video_config: JSON.stringify({ max_duration: 3, max_file_size: 50000000,
      recording: { max_duration_ms: 3000, audio: { enabled: false, mute: true } },
      trim: { max_duration_ms: "60000", max_size_mb: "100" },
      upload: { max_duration: 60, max_upload_bytes: 104857600 },
      unknown: { max_duration: 3, max_size_mb: 100 } }),
    camera_roll_video_upload_config: '{"max_duration":60,"max_file_size":104857600}',
    camera_roll_video_max_duration: "60.0", video_upload_max_duration: "60.0",
    max_video_record_duration: "3.0", max_file_size: "50000000"
  } } }).body.entries;
  const camera = JSON.parse(entries.camera), shared = JSON.parse(entries.video_config);
  assert.equal(camera.max_duration, "60");
  assert.equal(camera.max_file_size, 50000000);
  assert.deepEqual(camera.upload, { max_duration: "10", max_file_size: "6291456" });
  assert.deepEqual(camera.video.audio, { enabled: "true", strip_audio: false });
  assert.equal(shared.max_duration, 60);
  assert.equal(shared.max_file_size, 50000000);
  assert.equal(shared.recording.max_duration_ms, 60000);
  assert.deepEqual(shared.recording.audio, { enabled: true, mute: false });
  assert.deepEqual(shared.trim, { max_duration_ms: "10000", max_size_mb: "6" });
  assert.deepEqual(shared.upload, { max_duration: 10, max_upload_bytes: 6291456 });
  assert.deepEqual(shared.unknown, { max_duration: 3, max_size_mb: 100 });
  assert.deepEqual(JSON.parse(entries.camera_roll_video_upload_config), { max_duration: 10, max_file_size: 6291456 });
  assert.equal(entries.camera_roll_video_max_duration, "10.0");
  assert.equal(entries.video_upload_max_duration, "10.0");
  assert.equal(entries.max_video_record_duration, "60.0");
  assert.equal(entries.max_file_size, "50000000");
});

test("the default caption profile renders with gradients and no external artwork dependency", () => {
  const entries = run({ url: firebase, payload: { entries: {
    overlay_dynamic_captions: '["weather","music","cuios_old_id"]'
  } } }).body.entries;
  const captions = JSON.parse(entries.overlay_items).flatMap(group => group.items);
  assert.equal(captions.length, 54);
  assert.ok(captions.every(item => item.caption.background.colors.length === 2 && !item.caption.background.image));
  assert.ok(captions.every(item => item.caption.localized_text.vn === item.caption.text && item.caption.localized_text.vi === item.caption.text));
  assert.deepEqual(JSON.parse(entries.overlay_dynamic_captions), ["standard", "weather", "music"]);
  assert.equal(entries.widget_frame_event, undefined);
  assert.equal(entries.video_config, undefined);
});

test("real HTTPS diagnostic routes export the same private-data-free report without local DNS", () => {
  const store = memoryStore();
  run({ url: firebase, payload: { entries: { mh_mic_enabled_v99: "false", audio_secret: "never-export-this" } }, store });
  const url = "https://firebaseremoteconfig.googleapis.com/cuios-check?view=report";
  const response = run({ url, requestOnly: true, store }).output.response;
  const parsed = JSON.parse(response.body);
  assert.equal(parsed.runtime, "4.1.1");
  assert.deepEqual(parsed.recipe, { recordingSeconds: 60, uploadSeconds: 10, uploadBytes: 6291456, captions: 54 });
  assert.equal(parsed.deviceFeaturesVerified, false);
  assert.ok(parsed.observed.firebase.inputMediaFields.some(field => field.path === "entries" && field.field === "mh_mic_enabled_v99" && field.flag === "off"));
  assert.ok(!response.body.includes("never-export-this"));
  const html = run({ url: url.replace("view=report", "view=status"), requestOnly: true, store }).output.response;
  assert.ok(html.body.includes("href='/cuios-check?view=report'"));
  assert.ok(html.body.includes("href='/cuios-check?view=status'"));
  assert.equal(run({ url, requestOnly: true, method: "POST", store }).output.response.status, 405);
  assert.equal(run({ url, requestOnly: true, method: "HEAD", store }).output.response.body, "");
  assert.equal(rules.filter(rule => rule.type === "http-request" && rule.pattern.test(url)).length, 1);
});

test("v4.0.0 remains immutable and its 100 MiB library overwrite is corrected in this release", () => {
  const crypto = require("node:crypto");
  const previous = fs.readFileSync(path.join(root, "scripts/releases/locket-v4.0.0-fddb9e4d0469.js"));
  assert.equal(crypto.createHash("sha256").update(previous).digest("hex"), "fddb9e4d046964b2fbd846a57c5a41ed77b9bc161b5bb83a54e228b2c2a839d3");
  const entries = run({ url: firebase, payload: { entries: {
    camera: '{"max_duration":60}', camera_roll: '{"max_duration":60,"max_upload_bytes":104857600}'
  } } }).body.entries;
  assert.equal(JSON.parse(entries.camera).max_duration, 60);
  assert.equal(JSON.parse(entries.camera_roll).max_duration, 10);
  assert.equal(JSON.parse(entries.camera_roll).max_upload_bytes, 6291456);
});
