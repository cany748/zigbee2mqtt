import * as esbuild from "esbuild";
const Z = "/home/user/zigbee2mqtt";
await esbuild.build({
    entryPoints: [`${Z}/test/mocks/zigbeeHerdsman.ts`], bundle: true, platform: "node", format: "cjs", outfile: "fake-herdsman.cjs", logLevel: "warning",
    plugins: [{name: "map", setup(b) {
        b.onResolve({filter: /^vitest$/}, () => ({path: `${Z}/native-research/runtime-bench/fake-vitest.ts`}));
        b.onResolve({filter: /lib\/util\/utils$/}, () => ({path: `${Z}/dist/util/utils.js`, external: true}));
        b.onResolve({filter: /^zigbee-herdsman/}, (a) => ({path: a.path, external: true}));
    }}],
});
