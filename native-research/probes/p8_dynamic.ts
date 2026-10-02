// Converter-style dynamic code: untyped payloads, lookup tables, closures in object literals
type KeyValue = Record<string, any>;
interface Converter { cluster: string; type: string[]; convert: (msg: KeyValue, meta: KeyValue) => KeyValue | undefined; }
const fz: Record<string, Converter> = {
    on_off: {cluster: "genOnOff", type: ["attributeReport", "readResponse"], convert: (msg) => (msg.data.onOff !== undefined ? {state: msg.data.onOff === 1 ? "ON" : "OFF"} : undefined)},
    brightness: {cluster: "genLevelCtrl", type: ["attributeReport"], convert: (msg, meta) => ({brightness: Math.round(msg.data.currentLevel * (meta.scale ?? 1))})},
};
const definitions: KeyValue[] = [{model: "LED1545G12", vendor: "IKEA", fromZigbee: [fz.on_off, fz.brightness], exposes: [{type: "light", features: ["state", "brightness"]}]}];
const msgs: KeyValue[] = [{cluster: "genOnOff", type: "attributeReport", data: {onOff: 1}}, {cluster: "genLevelCtrl", type: "attributeReport", data: {currentLevel: 100}}];
let state: KeyValue = {};
for (const msg of msgs) {
    for (const conv of definitions[0].fromZigbee as Converter[]) {
        if (conv.cluster === msg.cluster && conv.type.includes(msg.type)) {
            const r = conv.convert(msg, {scale: 2});
            if (r) state = {...state, ...r};
        }
    }
}
console.log(JSON.stringify(state));
const anyVal: any = JSON.parse('{"x": {"y": [1, "two", {"z": true}]}}');
console.log(anyVal.x.y[2].z, anyVal.x.y.length, typeof anyVal.x.y[1]);
const o: KeyValue = {}; o["dyn_" + 1] = 5; Object.assign(o, {b: 2}); console.log(Object.entries(o).length, Object.values(o).reduce((a: number, b: number) => a + b, 0));
const fn = definitions[0].fromZigbee[0].convert; console.log(JSON.stringify(fn({data: {onOff: 0}}, {})));
