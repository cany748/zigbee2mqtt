function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
}
async function main(): Promise<void> {
    let ticks = 0;
    const iv = setInterval(() => { ticks++; }, 10);
    const slow = new Promise<string>((r) => setTimeout(() => r("slow"), 200));
    try { await withTimeout(slow, 50); } catch (e) { console.log("caught", (e as Error).message); }
    console.log(await withTimeout(Promise.resolve("fast"), 50));
    clearInterval(iv);
    console.log("ticks>2", ticks > 2);
    setImmediate(() => console.log("immediate"));
    queueMicrotask(() => console.log("microtask"));
}
void main();
