// Runs real fromZigbee converters of loaded definitions over synthetic ZCL reports.
globalThis.__workload = function (defsModules, iterations) {
  const convs = [];
  for (const m of defsModules) for (const d of m.definitions) for (const c of d.fromZigbee || []) {
    if (c.cluster === "genOnOff" || c.cluster === "genLevelCtrl" || c.cluster === "msTemperatureMeasurement" || c.cluster === "lightingColorCtrl") convs.push([d, c]);
  }
  const device = {ieeeAddr: "0x00124b0012345678", modelID: "x", manufacturerName: "y", meta: {}, endpoints: [], getEndpoint() { return this.ep; }, save() {}};
  device.ep = {ID: 1, deviceIeeeAddress: device.ieeeAddr, getDevice: () => device, clusters: {}, getClusterAttributeValue: () => undefined, saveClusterAttributeKeyValue() {}};
  let ok = 0, err = 0; const t0 = Date.now();
  for (let i = 0; i < iterations; i++) {
    const [d, c] = convs[i % convs.length];
    const msg = {cluster: c.cluster, type: "attributeReport", data: {onOff: i & 1, currentLevel: i & 255, measuredValue: 2150 + (i % 100), currentX: 20000, currentY: 21000, colorTemperature: 300}, endpoint: device.ep, device, linkquality: 120, groupID: 0, meta: {zclTransactionSequenceNumber: i & 255}};
    const meta = {state: {}, device, logger: console, options: {}};
    try { const r = c.convert(d, msg, () => {}, {}, meta); if (r && typeof r.then === "function") r.catch(() => {}); JSON.stringify(r); ok++; } catch (e) { err++; }
  }
  return {convs: convs.length, ok, err, ms: Date.now() - t0};
};
