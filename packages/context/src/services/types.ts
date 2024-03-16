/**
 * A type representing all allowed JSON primitive values.
 *
 */
export type JsonPrimitive = number | string | boolean | null;
/**
 * A type representing all allowed JSON object values.
 *
 */
export type JsonObject = {
    [key in string]?: JsonValue;
};
/**
 * A type representing all allowed JSON array values.
 *
 */
export type JsonArray = Array<JsonValue>;

/**
 * A type representing all allowed JSON values.
 *
 */
export type JsonValue = JsonObject | JsonArray | JsonPrimitive;

import v8 from "v8";

export type Info = {
    nodeVersion: string;
    uptime: number;
    loadAvg: number[];
    host: string;
    build?: BuildInfo;
};

export type MemoryInfo = {
    memoryUsage: any;
    totalMem: number;
    freeMem: number;
    heap: v8.HeapInfo;
    heapSpace: v8.HeapSpaceInfo[];
    heapCodeStatistics: v8.HeapCodeStatistics;
};

export type BuildInfo = {
    name?: string;
    description?: string;
    version?: string;
    repository?: string;
    engines?: string[];
    license?: string;
    keywords?: string[];
    nodeBoot: string;
    serverFramework: string;
    serverVersion: string;
};
