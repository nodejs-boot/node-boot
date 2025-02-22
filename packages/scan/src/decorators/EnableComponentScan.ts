import fs from "fs";
import path from "path";
import {MAIN_DECORATORS} from "../decorators.main";

type EnableComponentScanOptions = {
    verbose: boolean;
};

/**
 * @EnableComponentScan Decorator
 *
 * Auto scan for Node-Boot beans.
 * ### Concept:
 *  - **Prefers Pre-built Beans JSON**: Reads `node-boot-beans.json` for faster imports.
 *  - **Fallback to Active Scanning**: If JSON is missing, it scans `dist/` or `src/`.
 *  - **Ensures Efficient Imports**: Avoids duplicate imports using `require.cache`.
 *
 * ### Features:
 * - **Automatic Folder Detection**: Runs in `src/` during development and `dist/` in production.
 * - **Avoids Duplicate Imports**: Uses `require.cache` to skip already imported modules.
 * - **Handles Index Files**: If a folder contains `index.js`, only the `index.js` file is skipped, not the entire folder.
 * - **Skips Unnecessary Files**:
 *   - Ignores `.d.ts` (TypeScript declaration files)
 *   - Skips non-JavaScript files unless necessary
 *   - Avoids reloading already imported files
 *
 * ### Usage Example:
 * ```typescript
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class FactsServiceApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function EnableComponentScan(options?: EnableComponentScanOptions): ClassDecorator {
    const {verbose = false} = options ?? {};
    return function () {
        // Determine the correct base folder: `dist/` in production, `src/` in development
        const basePath = path.resolve(process.cwd(), "dist");

        const beansFilePath = path.join(basePath, "node-boot-beans.json");

        console.log(`============================= Node-Boot Beans Resolution =============================`);
        console.log(`🔍 Checking for pre-built beans file: ${beansFilePath}`);

        function verboseLog(log: () => void) {
            if (verbose) {
                log();
            }
        }

        if (fs.existsSync(beansFilePath)) {
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

                    return; // Exit early since beans.json was successfully used
                }
            } catch (error) {
                console.error(`⚠️ Error reading beans file, falling back to active scanning:`, error);
            }
        }

        console.log(`⚠️ Beans file not found or invalid. Performing active scanning...`);

        function fileContainsRelevantDecorator(filePath: string): boolean {
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                return MAIN_DECORATORS.some(decorator => content.includes(`${decorator})`));
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

                    if (require.cache[fullPath]) {
                        verboseLog(() => console.log(`⚡ Skipping already imported beans for file: ${fullPath}`));
                        continue;
                    }

                    if (!fileContainsRelevantDecorator(fullPath)) {
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
        } else {
            console.error(`❌ Scan path does not exist: ${basePath}`);
        }
    };
}
