export interface OpenAiConfigProperties {
    /**
     * Defaults to process.env['OPENAI_API_KEY'].
     */
    apiKey?: string | undefined;

    /**
     * Defaults to process.env['OPENAI_ORG_ID'].
     */
    organization?: string | null | undefined;

    /**
     * Defaults to process.env['OPENAI_PROJECT_ID']
     */
    project?: string | null | undefined;

    /**
     * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
     *
     * Defaults to process.env['OPENAI_BASE_URL'].
     */
    baseURL?: string | null | undefined;

    /**
     * The maximum amount of time (in milliseconds) that the client should wait for a response
     * from the server before timing out a single request.
     *
     * Note that request timeouts are retried by default, so in a worst-case scenario you may wait
     * much longer than this timeout before the promise succeeds or fails.
     */
    timeout?: number | undefined;

    /**
     * The maximum number of times that the client will retry a request in case of a
     * temporary failure, like a network error or a 5XX error from the server.
     *
     * @default 2
     */
    maxRetries?: number | undefined;
}
