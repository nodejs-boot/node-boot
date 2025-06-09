import fs from "fs";
import path from "path";
import {MAIN_DECORATORS} from "../decorators.main";
import * as console from "node:console";

type Options = {
    customDecorators: Function[];
};

/**
 * @EnableComponentScan
 *
 * A **Node-Boot** class decorator that performs **automatic component registration**
 * by scanning compiled JavaScript files for known decorators (e.g., `@Controller`, `@Service`)
 * or loading from a prebuilt bean manifest (`node-boot-beans.json`).
 *
 * Designed to work in tandem with the `node-boot-aot-beans.js` script for faster startup,
 * this decorator streamlines the bootstrapping process of your Node-Boot application by
 * importing all necessary beans automatically.
 *
 * ---
 *
 * ### How It Works:
 * 1. **Production Mode (`dist/`)**:
 *    - Looks for `dist/node-boot-beans.json` (generated at build time).
 *    - Dynamically imports all listed files unless they're already cached.
 *
 * 2. **Development Mode (`src/`) or Fallback**:
 *    - If no JSON file is found or custom decorators are provided,
 *      it performs a full recursive scan of the codebase (defaults to `dist/`).
 *    - Loads files that contain relevant decorators.
 *
 * ---
 *
 * ### Features:
 * - ✅ **AOT-Aware**: Prioritizes reading precomputed metadata (`node-boot-beans.json`) for fast startup.
 * - 🔍 **Dynamic Scanning Fallback**: Falls back to live scanning when needed (e.g., during dev or missing beans file).
 * - ⚡ **Smart Importing**: Prevents redundant imports using `require.cache`.
 * - 🧩 **Extensible**: Accepts custom decorators via `options.customDecorators`.
 * - 🛡 **Robust Logging**: Gives informative logs during both scanning and importing.
 *
 * ---
 *
 * ### Options:
 * ```ts
 * {
 *   customDecorators: Function[]; // Add support for custom component decorators
 * }
 * ```
 *
 * ### Usage:
 * ```ts
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class MyApp implements NodeBootApp {
 *   start(): Promise<NodeBootAppView> {
 *     return NodeBoot.run(ExpressServer);
 *   }
 * }
 * ```
 *
 * ### Environment Behavior:
 * - If `NODE_ENV !== "production"` → verbose logs enabled, source scanning more likely.
 * - Automatically resolves correct path depending on whether the app is running inside `dist/`.
 *
 * ---
 *
 * @author
 * Manuel Santos <ney.br.santos@gmail.com>
 */
export function EnableComponentScan(options?: Options): ClassDecorator {
    function scanDecorators() {
        const additionalDecorators = options ? options.customDecorators.map(decorator => decorator.name) : [];
        return [...MAIN_DECORATORS, ...additionalDecorators];
    }

    return function () {
        const decorators = scanDecorators();

        const verbose = process.env["NODE_ENV"] !== "production";
        let basePath: string;
        // Check if the current working directory (`process.cwd()`) already contains "dist"
        if (process.cwd().includes("dist")) {
            basePath = process.cwd(); // If inside dist, just use the current working directory
        } else {
            basePath = path.resolve(process.cwd(), "dist"); // Otherwise, resolve the path to dist/
        }

        const beansFilePath = path.join(basePath, "node-boot-beans.json");

        console.log(`============================= Node-Boot Beans Resolution =============================`);
        console.log(`🔍 Checking for pre-built beans file: ${beansFilePath}`);

        function verboseLog(log: () => void) {
            if (verbose) {
                log();
            }
        }

        // If custom decorators are provided it should do active scanning
        if (!options?.customDecorators && fs.existsSync(beansFilePath)) {
            try {
                const beans = JSON.parse(fs.readFileSync(beansFilePath, "utf-8"));

                if (Array.isArray(beans) && beans.length > 0) {
                    console.log(`🚀 Beans file found. Importing beans...`);

                    beans.forEach(beanPath => {
                        const absolutePath = path.join(basePath, beanPath);

                        if (!require.cache[absolutePath]) {
                            verboseLog(() => console.log(`📦 Importing beans from : ${absolutePath}`));
                            require(absolutePath);
                        } else {
                            verboseLog(() => console.log(`⚡ Skipping already imported module: ${absolutePath}`));
                        }
                    });
                    console.log(`${beans.length} application beans successfully imported`);
                    return; // Exit early since beans.json was successfully used
                }
            } catch (error) {
                console.error(`⚠️ Error reading beans file, falling back to active scanning:`, error);
            }
        }

        console.log(`⚠️ Beans file not found or invalid. Performing active scanning...`);
        let scannedBeans = 0;

        function fileContainsRelevantDecorator(filePath: string): boolean {
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                return decorators.some(decorator => content.includes(`${decorator})`));
            } catch (error) {
                console.error(`❌ Error reading file: ${filePath}`, error);
                return false;
            }
        }

        function importFilesFromDir(dir: string) {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const fullPath = path.join(dir, file);
                const isDirectory = fs.statSync(fullPath).isDirectory();

                if (isDirectory) {
                    importFilesFromDir(fullPath);
                } else {
                    if (file === "index.js" || file.endsWith(".d.ts") || !file.endsWith(".js")) {
                        continue;
                    }

                    if (!fileContainsRelevantDecorator(fullPath)) {
                        continue;
                    }
                    // increment beans counter
                    scannedBeans++;

                    if (require.cache[fullPath]) {
                        verboseLog(() => console.log(`⚡ Skipping already imported beans for file: ${fullPath}`));
                        continue;
                    }

                    try {
                        verboseLog(() => console.log(`📦 Importing beans from file: ${fullPath}`));
                        require(fullPath);
                    } catch (error) {
                        console.error(`⚠️ Failed to import ${fullPath}:`, error);
                    }
                }
            }
        }

        if (fs.existsSync(basePath)) {
            importFilesFromDir(basePath);
            console.log(`${scannedBeans} application beans successfully imported`);
        } else {
            console.error(`❌ Scan path does not exist: ${basePath}`);
        }
    };
}
