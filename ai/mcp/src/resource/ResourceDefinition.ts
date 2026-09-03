/**
 * Describes a Model Context Protocol resource: a piece of contextual data (a document, a
 * database row, a file, ...) that an MCP client can list and read by URI, in addition to
 * (and independently of) the tools an MCP server exposes.
 *
 * @see https://modelcontextprotocol.io/docs/concepts/resources
 */
export interface ResourceDefinition {
    /** Unique URI identifying this resource, e.g. `"todos://all"` or `"todos://42"`. */
    uri: string;
    /** Human/machine readable resource name. */
    name: string;
    /** Optional human-readable description shown to MCP clients. */
    description?: string;
    /** Optional MIME type of the resource contents, e.g. `"application/json"`, `"text/plain"`. */
    mimeType?: string;
}

/** The actual contents returned for a `resources/read` request. */
export interface ResourceContent {
    /** Text contents. Mutually exclusive with `blob`. */
    text?: string;
    /** Base64-encoded binary contents. Mutually exclusive with `text`. */
    blob?: string;
    /** Overrides `ResourceDefinition.mimeType` for this particular read, if provided. */
    mimeType?: string;
}

export interface ResourceCallback {
    readonly definition: ResourceDefinition;
    read(uri: string): Promise<ResourceContent | string> | ResourceContent | string;
}

/**
 * Adapts a plain function into a `ResourceCallback`, mirroring `FunctionToolCallback` from
 * `@nodeboot/ai-core`.
 */
export class FunctionResourceCallback implements ResourceCallback {
    readonly definition: ResourceDefinition;
    private readonly fn: (uri: string) => Promise<ResourceContent | string> | ResourceContent | string;

    constructor(
        definition: ResourceDefinition,
        fn: (uri: string) => Promise<ResourceContent | string> | ResourceContent | string,
    ) {
        this.definition = definition;
        this.fn = fn;
    }

    read(uri: string): Promise<ResourceContent | string> | ResourceContent | string {
        return this.fn(uri);
    }
}
