module.exports = {
    preset: "ts-jest",
    globals: {
        "ts-jest": {
            tsConfig: {
                target: "ESNext",
                strict: false,
            }
        }
    },
    setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"]
};