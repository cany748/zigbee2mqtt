// Minimal stand-in for vitest's `vi` used by test/mocks/zigbeeHerdsman.ts.
// Does NOT record calls (a real vi.fn would grow memory forever).
export type Mock<T = any> = any;
export const vi = {
    fn(impl?: (...args: any[]) => any): any {
        let current = impl;
        const f = function (this: unknown, ...args: any[]) {
            return current ? current.apply(this, args) : undefined;
        } as any;
        f.mockImplementation = (n: any) => ((current = n), f);
        f.mockImplementationOnce = (n: any) => ((current = n), f);
        f.mockReturnValue = (v: any) => ((current = () => v), f);
        f.mockResolvedValue = (v: any) => ((current = () => Promise.resolve(v)), f);
        f.mockRejectedValue = (v: any) => ((current = () => Promise.reject(v)), f);
        f.mockClear = () => f;
        f.mockReset = () => f;
        f.mock = {calls: [], results: []};
        return f;
    },
    mock() {},
};
