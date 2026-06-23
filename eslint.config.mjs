import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";
import prettier from "eslint-config-prettier";
import {fileURLToPath} from "url";
import {dirname} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FlatCompat helper to use legacy configs in flat config format
const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default [
    // Global ignores
    {
        ignores: ["dist/", "node_modules/", "coverage/", "scripts/", "**/*.d.ts", "**/*.js"],
    },

    // Base ESLint recommended rules
    js.configs.recommended,

    // TypeScript ESLint recommended configuration
    ...tseslint.configs.recommended,

    // TypeScript files configuration
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            "import-x": importX,
        },
        settings: {
            "import-x/resolver": {
                typescript: true,
                node: {
                    extensions: [".js", ".jsx", ".ts", ".tsx"],
                },
            },
        },
        rules: {
            // Import plugin rules
            "import-x/no-cycle": ["error", {maxDepth: 1}],
            "import-x/named": "off", // Disable named import checks, as they can conflict with TypeScript's own checks

            // ESLint 10 new rules - disabled to maintain existing codebase behavior
            "no-useless-assignment": "warn", // Changed from error to warn for gradual adoption
            "preserve-caught-error": "warn", // Changed from error to warn for gradual adoption

            // Custom rule overrides
            "no-cond-assign": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-member-accessibility": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-parameter-properties": "off",
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-unnecessary-type-assertion": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-require-imports": "off",
        },
    },

    // Prettier config (must be last to override formatting rules)
    prettier,

    // FIXME update eslint-config-katxupa to be ESLint 9+ compatible and remove FlatCompat usage
    // Use FlatCompat for eslint-config-katxupa if it's not ESLint 9+ compatible
    ...compat.extends("katxupa"),
];
