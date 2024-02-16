module.exports = {
    preset: "ts-jest",
    globals: {
        "ts-jest": {
            tsConfig: {
                target: "ESNext",
                strict: false,
            }
        }
    }
};