/**
 * Extra options that apply to each controller action.
 */
export interface ApplicationOptions {
    environment?: string;
    platform?: string;
    name?: string;
    port?: number;

    /**
     * Global Options for exposed REST endpoints
     * */
    apiOptions?: ApiOptions;

    /**
     * Options controlling how application lifecycle feature adapters (e.g. @PostConstruct,
     * @Scheduler, starter auto-configurations) are bound at startup.
     */
    lifecycle?: LifecycleOptions;
}

export type LifecycleOptions = {
    /**
     * When `true`, a lifecycle feature adapter that throws while binding (for example, a
     * `@PostConstruct` method that fails) immediately terminates the process with exit code 1
     * instead of being logged and skipped.
     *
     * Defaults to `false`: a failing adapter is logged and the application keeps starting with
     * that bean left half-initialized, which is almost never what you want in production but is
     * kept as the default for backwards compatibility.
     */
    failFast?: boolean;
};

export type ApiOptions = {
    /**
     * Global route prefix, for example '/api'.
     */
    routePrefix?: string;

    /**
     * If set, all null responses will return specified status code by default
     */
    nullResultCode?: number;

    /**
     * If set, all undefined responses will return specified status code by default
     */
    undefinedResultCode?: number;

    /**
     * Default param options
     */
    paramOptions?: {
        /**
         * If true, all non-set parameters will be required by default
         */
        required?: boolean;
    };
};
