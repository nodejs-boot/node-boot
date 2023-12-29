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
