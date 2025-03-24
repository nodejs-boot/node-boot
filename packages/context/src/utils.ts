export const PLACEHOLDER_REGEX = /^\$\{(.+?)\}$/;

/**
 * Extracts the key from a placeholder string formatted as "${key}".
 * If the input does not match the expected format, it returns `null`.
 *
 * @param {string} placeholder - The placeholder string, e.g., "${com.example.aws.sqs.queue-url}".
 * @returns {string | null} - The extracted key if the format matches, otherwise `null`.
 *
 * @example
 * extractPlaceholderKey("${com.example.aws.sqs.queue-url}"); // "com.example.aws.sqs.queue-url"
 * extractPlaceholderKey("https://sqs.us-east-1.amazonaws.com/123456789012/my-queue");
 * // undefined (fallback)
 */
export function extractPlaceholderKey(placeholder: string): string | undefined {
    const match = placeholder.match(PLACEHOLDER_REGEX);
    return match ? match[1] : undefined;
}

/**
 * Checks if a given string is a placeholder formatted as "${key}".
 *
 * @param {string} value - The string to check.
 * @returns {boolean} - `true` if the string is a placeholder, otherwise `false`.
 *
 * @example
 * isPlaceholder("${com.example.aws.sqs.queue-url}"); // true
 * isPlaceholder("https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"); // false
 */
export function isPlaceholder(value: string): boolean {
    return PLACEHOLDER_REGEX.test(value);
}
