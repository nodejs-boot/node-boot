/* eslint-disable @typescript-eslint/no-unsafe-assignment */
module.exports = {
    root: true,
    env: {node: true},
    ignorePatterns: ["dist/", "node_modules/", "coverage/", "scripts/", "**/*.d.ts"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "katxupa",
        "plugin:import/recommended",
    ],
    plugins: ["@typescript-eslint"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.json",
    },
    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },
        },
    },
    rules: {
        "no-cond-assign": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/explicit-member-accessibility": 0,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-parameter-properties": 0,
        "@typescript-eslint/interface-name-prefix": 0,
        "@typescript-eslint/explicit-module-boundary-types": 0,
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-unnecessary-type-assertion": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-cond-assign": "off",
        "import/no-cycle": ["error", {maxDepth: 1}],
        "import/named": "off", // Disable named import checks, as they can conflict with TypeScript's own checks
    },
};
