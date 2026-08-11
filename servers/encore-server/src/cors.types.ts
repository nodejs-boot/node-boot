export type StaticOrigin = boolean | string | RegExp | Array<boolean | string | RegExp>;

export type CustomOrigin = (
    requestOrigin: string | undefined,
    callback: (err: Error | null, origin?: StaticOrigin) => void,
) => void;

export interface CorsOptions {
    origin?: StaticOrigin | CustomOrigin;
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
}
