export {};

declare global {
    function xpto(
        name: string,
        fn: jest.ProvidesCallback,
        times: number,
        measureMethod: "foo" | "bar",
        timeout?: number,
    ): void;
}

const _global = typeof window !== "undefined" ? window : globalThis;

_global.xpto = async (
    name: string,
    fn: jest.ProvidesCallback,
    times: number,
    measureMethod: string,
    timeout?: number,
) => {
    console.log(`Running scenario ${name}: ${times} times, measuring with ${measureMethod}`);
    return test(name, fn, timeout);
};
