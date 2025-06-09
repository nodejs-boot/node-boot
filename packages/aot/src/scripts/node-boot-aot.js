#!/usr/bin/env node

/**
 * Node-Boot AOT Runner
 *
 * This script runs all Ahead-of-Time (AOT) generation steps provided by `@nodeboot/aot`.
 * It simply imports the two individual AOT scripts, which execute on load.
 *
 * Steps:
 * 1. 🧠 Generate `node-boot-beans.json` from decorated runtime components
 * 2. 🧬 Generate `node-boot-models.json` from `@Model` classes
 *
 * Usage:
 * ```sh
 * node node-boot-aot.js
 * ```
 *
 * Or add to your `package.json`:
 * ```json
 * {
 *   "scripts": {
 *     "postbuild": "node node-boot-aot.js"
 *   }
 * }
 * ```
 */

console.log("🚀 Running all Node-Boot AOT scripts...");

try {
    require("./node-boot-aot-beans.js");
} catch (e) {
    console.error("❌ Failed to run bean scanner:", e);
}

try {
    require("./node-boot-aot-model-schema");
} catch (e) {
    console.error("❌ Failed to run model schema generator:", e);
}

console.log("✅ Node-Boot AOT complete.");
