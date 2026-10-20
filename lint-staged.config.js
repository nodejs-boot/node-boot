/**
 * lint-staged appends the staged file paths to every string command. The workspace-wide scripts below (turbo
 * tasks) take no file arguments - `turbo run build <file>` fails with "Could not find task" - so they are
 * returned from functions, which lint-staged runs as-is.
 */
module.exports = {
    "*.{ts,tsx,js,jsx}": () => ["pnpm build", "pnpm nodeboot:check:type-deps", "pnpm lint-format:fix"],
    "*.{json,md,css,html}": "prettier --write",
};
