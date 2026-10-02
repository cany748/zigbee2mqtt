// Core language features used throughout z2m / herdsman / converters
type KeyValue = Record<string, any>;
abstract class Base {
    static count = 0;
    protected name: string;
    constructor(name: string) { this.name = name; Base.count++; }
    get label(): string { return `<${this.name}>`; }
    abstract kind(): string;
}
class Dev extends Base {
    #secret = 42;
    kind(): string { return "device"; }
    get secret(): number { return this.#secret; }
}
class MyErr extends Error { constructor(msg: string, public code: number) { super(msg); this.name = "MyErr"; } }
function* gen(n: number): Generator<number> { for (let i = 0; i < n; i++) yield i * 2; }
async function delay(v: number): Promise<number> { return await Promise.resolve(v + 1); }
async function main(): Promise<void> {
    const d = new Dev("lamp");
    console.log(d.label, d.kind(), d.secret, Base.count, d instanceof Base);
    const m = new Map<string, number>([["a", 1]]); m.set("b", 2);
    const s = new Set<string>(["x", "y", "x"]);
    console.log([...m.entries()].map(([k, v]) => `${k}=${v}`).join(","), s.size);
    console.log([...gen(4)].join(","));
    console.log(await delay(1), (await Promise.all([delay(1), delay(2)])).join(","));
    const payload: KeyValue = {state: "ON", brightness: 254, color: {x: 0.3, y: 0.4}};
    const merged: KeyValue = {...payload, extra: [1, 2, 3]};
    const {state, ...rest} = merged;
    console.log(state, Object.keys(rest).join(","), JSON.stringify(merged));
    for (const k in payload) { if (typeof payload[k] === "number") console.log("num", k); }
    delete merged.extra;
    console.log("extra" in merged, merged?.color?.x ?? "none", merged.missing?.deep ?? "dflt");
    try { throw new MyErr("boom", 7); } catch (e) { console.log((e as MyErr).name, (e as Error).message, (e as MyErr).code, e instanceof MyErr); }
    const re = /^0x([0-9a-f]{16})$/i; const mm = re.exec("0x00124B0012345678");
    console.log(mm ? mm[1] : null, "a-b_c".replace(/[-_]/g, (c) => (c === "-" ? "+" : "*")));
    const parsed = JSON.parse('{"a":[1,{"b":null}],"c":true}') as KeyValue;
    console.log(parsed.a[1].b === null, parsed.c, Array.isArray(parsed.a));
    const fns: Record<string, (v: number) => number> = {double: (v) => v * 2, sq: (v) => v * v};
    console.log(Object.entries(fns).map(([k, f]) => `${k}:${f(3)}`).join(" "));
    const big = 0xffffffffn + 1n; console.log(big.toString(16));
    const sorted = [3, 1, 2].sort((a, b) => a - b); console.log(sorted.join(""), Math.round(2.5), (1.005).toFixed(2), Number.parseInt("ff", 16));
    console.log(new Date(0).toISOString());
    console.log(String(undefined), `${null}`, typeof (() => 1), [1, [2, [3]]].flat(2).length);
}
main().catch((e) => console.log("FAIL", e));
