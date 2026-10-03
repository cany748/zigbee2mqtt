// Full z2m start with the test-suite fake coordinator (64 devices) + a steady stream of ZCL reports.
// usage: <runtime> fake-run.cjs <dataDir> <seconds> <msgsPerSec>
const fs = require("node:fs");
const [dataDir, seconds = "60", rate = "50"] = process.argv.slice(2);
process.env.ZIGBEE2MQTT_DATA = dataDir;
const zhController = require("zigbee-herdsman/dist/controller/controller");
const fake = require("./fake-herdsman.cjs");
// Patch the real Controller's prototype (works even when a bundler snapshots the export binding).
for (const [k, v] of Object.entries(fake.mockController)) {
    Object.defineProperty(zhController.Controller.prototype, k, {value: v, writable: true, configurable: true});
}
const status = () => Object.fromEntries(fs.readFileSync("/proc/self/status", "utf8").split("\n").filter((l) => /^(VmRSS|VmHWM|RssAnon|RssFile)/.test(l)).map((l) => [l.split(":")[0], Math.round(Number.parseInt(l.split(/\s+/)[1]) / 1024)]));
const log = (...a) => process.stderr.write(`[bench] ${a.join(" ")}\n`);
(async () => {
    const t0 = Date.now();
    const {Controller} = require("../../dist/controller.js");
    const controller = new Controller(async () => {}, async (code) => { log("exit", code); process.exit(code); });
    await controller.start();
    log("started ms", Date.now() - t0, JSON.stringify(status()));
    const devs = Object.values(fake.devices).filter((d) => d.type !== "Coordinator" && d.endpoints.length > 0);
    const payloads = [
        (d) => ({cluster: "genOnOff", data: {onOff: Math.random() > 0.5 ? 1 : 0}}),
        (d) => ({cluster: "genLevelCtrl", data: {currentLevel: Math.floor(Math.random() * 254)}}),
        (d) => ({cluster: "msTemperatureMeasurement", data: {measuredValue: 2000 + Math.floor(Math.random() * 500)}}),
        (d) => ({cluster: "msRelativeHumidity", data: {measuredValue: 4000 + Math.floor(Math.random() * 2000)}}),
        (d) => ({cluster: "genPowerCfg", data: {batteryPercentageRemaining: Math.floor(Math.random() * 200)}}),
    ];
    let sent = 0;
    const iv = setInterval(() => {
        for (let i = 0; i < rate / 10; i++) {
            const device = devs[sent % devs.length];
            const p = payloads[sent % payloads.length](device);
            sent++;
            fake.events.message?.({...p, device, endpoint: device.endpoints[0], type: "attributeReport", linkquality: 100, groupID: 0, meta: {zclTransactionSequenceNumber: sent & 255}});
        }
    }, 100);
    const samples = [];
    const sampler = setInterval(() => samples.push(status().VmRSS), 1000);
    setTimeout(async () => {
        clearInterval(iv); clearInterval(sampler);
        const s = status();
        samples.sort((a, b) => a - b);
        log("RESULT", JSON.stringify({sent, devices: devs.length, rss_end: s.VmRSS, rss_peak: s.VmHWM, anon_end: s.RssAnon, file_end: s.RssFile, rss_median: samples[samples.length >> 1]}));
        await controller.stop(false, 0).catch(() => {});
        process.exit(0);
    }, Number(seconds) * 1000);
})().catch((e) => { log("FAIL", e?.stack ?? e); process.exit(1); });
