module.exports = {
    displayName: "native-http-supabase-sample",
    preset: "../../jest.preset.js",
    testEnvironment: "node",
    roots: ["<rootDir>"],
    testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.interface.ts"],
};
