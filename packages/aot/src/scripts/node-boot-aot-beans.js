#!/usr/bin/env node

import fs from "fs";
import path from "path";
import {MAIN_DECORATORS} from "../decorators.main";

/**
 * Node-Boot AOT Beans Generator
 *
 * This script performs **Ahead-of-Time (AOT)** analysis of compiled JavaScript files
 * in the `dist/` directory to detect classes annotated with key decorators like
 * `@Controller`, `@Service`, etc., and generates a manifest (`node-boot-beans.json`)
 * used for dynamic module registration at runtime.
 *
 * ### Features:
 * - **Post-Build Hook**: Designed to run after the TypeScript build process completes.
 * - **Decorator Detection**: Searches for files containing any of the known decorator types
 *   listed in `MAIN_DECORATORS`.
 * - **Excludes `index.js`**: Skips barrel/index files to reduce false positives.
 * - **Supports Nested Structures**: Recursively scans all subdirectories under `dist/`.
 * - **Relative Paths**: Output paths are stored relative to `dist/`, aiding in dynamic imports.
 * - **Safe by Default**: Creates `dist/` folder if missing (for robustness in CI/CD or clean builds).
 *
 * ### Output:
 * Generates a file at:
 * ```
 * dist/node-boot-beans.json
 * ```
 * This file contains an array of strings, each representing a path to a JavaScript module
 * exporting a decorated component (e.g., a controller or service).
 *
 * ### Usage:
 * Run manually:
 * ```sh
 * node node-boot-aot-beans.js
 * ```
 *
 * Or add it to your `package.json` lifecycle scripts:
 * ```json
 * {
 *   "scripts": {
 *     "postbuild": "node node-boot-aot-beans.js"
 *   }
 * }
 * ```
 *
 * ### Requirements:
 * - Decorators like `@Controller`, `@Service`, etc., must be defined in `MAIN_DECORATORS`.
 * - Ensure TypeScript has already been compiled to `dist/`.
 *
 * ---
 * Part of the Node-Boot AOT toolchain for optimizing startup and reducing runtime scanning.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */

// Define the `dist/` directory (output folder after TypeScript build)
const basePath = path.resolve(process.cwd(), "dist");

// Ensure `dist/` folder exists; create it if missing
if (!fs.existsSync(basePath)) {
    console.log(`⚠️  dist/ folder not found. Creating it now...`);
    fs.mkdirSync(basePath, {recursive: true});
}

const outputFile = path.join(basePath, "node-boot-beans.json");

console.log(`🔍 Scanning compiled files in: ${basePath}`);

/**
 * Checks if a given file contains any of the specified decorators.
 * @param {string} filePath - The full path of the file to check.
 * @returns {boolean} - Returns `true` if the file contains a relevant decorator.
 */
function fileContainsRelevantDecorator(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return MAIN_DECORATORS.some(decorator => content.includes(`${decorator})`));
    } catch {
        return false;
    }
}

/**
 * Recursively scans a directory for files containing relevant decorators.
 * @param {string} dir - The directory to scan.
 * @returns {string[]} - A list of file paths (relative to `dist/`) containing decorators.
 */
function scanDirectory(dir) {
    const beanFiles = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const isDirectory = fs.statSync(fullPath).isDirectory();

        if (isDirectory) {
            // Recursively scan subdirectories
            beanFiles.push(...scanDirectory(fullPath));
        } else if (file.endsWith(".js") && file !== "index.js" && fileContainsRelevantDecorator(fullPath)) {
            // Store relative path instead of absolute
            beanFiles.push(fullPath.replace(basePath + "/", ""));
        }
    }

    return beanFiles;
}

function runAOTBeans() {
    // Generate the list of beans
    const beans = scanDirectory(basePath);

    // Write to `node-boot-beans.json`
    console.log(`📄 Writing bean metadata to: ${outputFile}`);
    fs.writeFileSync(outputFile, JSON.stringify(beans, null, 2));

    console.log(`✅ node-boot-beans.json created with ${beans.length} beans.`);
}

runAOTBeans();
