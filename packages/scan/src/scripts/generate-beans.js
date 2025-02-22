import fs from "fs";
import path from "path";
import {MAIN_DECORATORS} from "../decorators.main";

/**
 * Node-Boot Beans Generator Script
 *
 * This script scans the compiled `dist/` directory for JavaScript files containing
 * specific decorators (e.g., `@Controller`, `@Service`, etc.). It then generates a
 * `node-boot-beans.json` file listing all relevant files that should be dynamically
 * imported during application startup.
 *
 * ### Features:
 * - **Ensures `dist/` Exists**: If the `dist/` folder is missing, it creates one.
 * - **Scans for Decorated Components**: Looks for known decorator names in `.js` files.
 * - **Excludes Index Files**: Skips `index.js` files to avoid unnecessary imports.
 * - **Stores Relative Paths**: Saves paths in `node-boot-beans.json` relative to `dist/`.
 *
 * ### Usage:
 * This script is meant to be run **after** the TypeScript build process to prepare
 * the list of components for efficient runtime scanning.
 *
 * Run it manually:
 * ```sh
 * node generate-node-boot-beans.js
 * ```
 *
 * Or add it to `package.json`:
 * ```json
 * {
 *   "scripts": {
 *     "postbuild": "node generate-node-boot-beans.js"
 *   }
 * }
 * ```
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

// Generate the list of beans
const beans = scanDirectory(basePath);

// Write to `node-boot-beans.json`
console.log(`📄 Writing bean metadata to: ${outputFile}`);
fs.writeFileSync(outputFile, JSON.stringify(beans, null, 2));

console.log(`✅ node-boot-beans.json created with ${beans.length} beans.`);
