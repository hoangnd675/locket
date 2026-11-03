"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const release = require("../release.json");
const protectedRelease = require("../protected-release.json");
const protectedCode = fs.readFileSync(path.join(root, protectedRelease.runtime), "utf8");

test("protected artifact matches its source release and keeps license notices without a source map", () => {
  assert.equal(protectedRelease.sourceRuntime, release.runtime);
  assert.equal(protectedRelease.sourceSha256, release.sha256);
  assert.equal(crypto.createHash("sha256").update(protectedCode).digest("hex"), protectedRelease.sha256);
  assert.equal(Buffer.byteLength(protectedCode), protectedRelease.bytes);
  assert.equal(protectedRelease.cryptographicAccessControl, false);
  assert.equal(protectedRelease.deviceVerified, false);
  assert.ok(protectedCode.includes(fs.readFileSync(path.join(root, "LICENSE"), "utf8").trim()));
  assert.ok(!protectedCode.includes("sourceMappingURL"));
  assert.ok(protectedRelease.bytes < 1024 * 1024);
  assert.equal(fs.existsSync(path.join(root, protectedRelease.runtime + ".map")), false);
});

test("protected modules preserve all original hook patterns and settings", () => {
  for (const filename of protectedRelease.modules) {
    const original = filename === "locket_cuios_protected_no_widget.sgmodule" ? "locket_cuios_no_widget.sgmodule"
      : filename === "locket60s_10s_6mb_protected.sgmodule" ? "locket60s_10s_6mb.sgmodule" : "locket_cuios_stable.sgmodule";
    const plain = fs.readFileSync(path.join(root, original), "utf8");
    const protectedModule = fs.readFileSync(path.join(root, filename), "utf8");
    const operationalLines = text => text.split("\n").filter(line => !line.startsWith("#!"));
    assert.deepEqual(operationalLines(protectedModule.replaceAll(protectedRelease.runtime, release.runtime)), operationalLines(plain));
    const paths = [...protectedModule.matchAll(/script-path=([^,\n]+)/g)].map(match => match[1]);
    assert.equal(paths.length, 5);
    assert.equal(new Set(paths).size, 1);
    assert.ok(paths[0].endsWith(protectedRelease.runtime));
    assert.ok(protectedModule.includes("/" + filename));
    assert.ok(!protectedModule.includes("Cuongqtx11"));
    assert.match(protectedModule, /^#!author=Cuios\.shop$/m);
    assert.ok(paths[0].startsWith("https://raw.githubusercontent.com/Cuios-shop/"));
  }
});

test("protected runtime runs without DOM, timers, Node APIs or dynamic code generation", () => {
  const options = { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } };
  assert.throws(() => vm.runInNewContext("Function('return 1')()", {}, options), /Code generation/);
  let calls = 0, output;
  vm.runInNewContext(protectedCode, {
    $request: { url: "https://firebaseremoteconfig.googleapis.com/v1/projects/locket-4252a/namespaces/firebase:fetch", headers: {} },
    $response: { status: 200, headers: {}, body: '{"state":"UPDATE","entries":{"untouched":"keep"}}' },
    console: { log() {} },
    $done(result) { calls++; output = JSON.parse(JSON.stringify(result)); }
  }, options);
  assert.equal(calls, 1);
  const body = JSON.parse(output.body);
  assert.equal(body.entries.untouched, "keep");
  assert.equal(JSON.parse(body.entries.camera).max_duration, 60);
  assert.equal(JSON.parse(body.entries.overlay_items).flatMap(group => group.items).length,
    fs.existsSync(path.join(root, "content/caption_backgrounds.json")) ? 94 : 54);
});
