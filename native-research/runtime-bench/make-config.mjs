import * as esbuild from "esbuild";
const Z = "/home/user/zigbee2mqtt";
const out = await esbuild.build({
    entryPoints: [`${Z}/test/mocks/data.ts`], bundle: true, platform: "node", format: "cjs", write: false, logLevel: "warning",
    plugins: [{name: "map", setup(b) {
        b.onResolve({filter: /^vitest$/}, () => ({path: `${Z}/native-research/runtime-bench/fake-vitest.ts`}));
        b.onResolve({filter: /^(tmp|js-yaml)$/}, (a) => ({path: a.path, external: true}));
    }}],
});
const m = {exports: {}};
new Function("module", "exports", "require", out.outputFiles[0].text)(m, m.exports, (await import("node:module")).createRequire(`${Z}/package.json`));
const cfg = structuredClone(m.exports.DEFAULT_CONFIGURATION);
cfg.mqtt.server = "mqtt://127.0.0.1:18830";
cfg.homeassistant = {enabled: true};
cfg.frontend = {enabled: true, port: 18080, host: "127.0.0.1"};
cfg.availability = {enabled: true};
cfg.advanced = {...(cfg.advanced ?? {}), log_level: "warning", log_output: ["console"]};
const fs = await import("node:fs");
fs.mkdirSync("data-template", {recursive: true});
fs.writeFileSync("data-template/configuration.yaml", (await import(`${Z}/node_modules/js-yaml/dist/js-yaml.mjs`)).dump(cfg));
console.log("devices in config:", Object.keys(cfg.devices).length, "groups:", Object.keys(cfg.groups ?? {}).length);
