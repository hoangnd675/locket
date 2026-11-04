"use strict";
// Offline timing on this machine only; this does not measure iPhone/Shadowrocket.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const root = path.resolve(__dirname, "..");
const release = require("../release.json");
const protectedRelease = require("../protected-release.json");
const moduleText = fs.readFileSync(path.join(root, protectedRelease.modules[0]), "utf8");
const argument = moduleText.match(/argument=([^,\n]+)/)?.[1];
const cases = ["revenuecat", "firebase", "firebase_looks", "firebase_looks_native"];
const results = {};
for (const kind of cases) {
  let reference;
  for (const [name, file] of [["canonical", release.runtime], ["protected", protectedRelease.runtime]]) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    const times = [];
    for (let i = 0; i < 5; i++) {
      let result, calls = 0;
      const sandbox = {
        $request: { url: kind.startsWith("firebase")
          ? "https://firebaseremoteconfig.googleapis.com/v1/projects/locket-4252a/namespaces/firebase:fetch"
          : "https://api.revenuecat.com/v1/subscribers/cuios-fixture", headers: { "User-Agent": "Locket/fixture" } },
        $response: { status: 200, headers: {}, body: kind.startsWith("firebase")
          ? JSON.stringify({ state: "UPDATE", entries: kind === "firebase" ? {} : {
            overlay_items: '[{"section":"Native fixture","items":[{"overlay_id":"filter:fixture_ai","source":"fixture"}]}]',
            overlay_dynamic_captions: '["standard","music"]'
          } }) : '{"subscriber":{"entitlements":{},"subscriptions":{}}}' },
        console: { log() {} },
        $done(value) { calls++; result = JSON.parse(JSON.stringify(value)); }
      };
      if (kind === "firebase_looks_native") sandbox.$argument = "looks-native";
      else if (kind === "firebase_looks") sandbox.$argument = "looks-aura-frame";
      else if (argument) sandbox.$argument = argument;
      const start = performance.now();
      vm.runInNewContext(code, sandbox, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
      times.push(Math.round((performance.now() - start) * 10) / 10);
      assert.equal(calls, 1);
      if (name === "canonical") reference = result;
      else assert.deepEqual(result, reference);
    }
    times.sort((a, b) => a - b);
    results[kind + "_" + name] = { medianMs: times[2], maxMs: times[4] };
  }
}
console.log(JSON.stringify({ deviceVerified: false, environment: "local Node.js sandbox", samplesPerCase: 5, results }, null, 2));
