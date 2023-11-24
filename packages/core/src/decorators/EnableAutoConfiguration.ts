import * as path from "path";
import * as fs from "fs";

function getProjectRootDirectory(): string {
    let currentDir = __dirname;
    while (!fs.existsSync(path.join(currentDir, "package.json"))) {
        // Navigate up one directory level
        currentDir = path.dirname(currentDir);
    }
    return currentDir;
}

async function instantiateClasses(rootDir, classes) {
    for (const classData of classes) {
        const {
            class: className,
            path: classPath,
            arguments: classArguments,
        } = classData;

        // Use dynamic import to handle the class asynchronously.
        const module = require(path.join(rootDir, classPath));
        const Class = module[className];

        const argumentsMetadata = Reflect.getMetadata(
            "design:paramtypes",
            Class,
        );

        // Check if the class has any constructor arguments (dependencies).
        if (argumentsMetadata && argumentsMetadata.length > 0) {
            const dependencies = argumentsMetadata.map((argType, index) => {
                const argValue = classArguments
                    ? classArguments[index]
                    : undefined;
                return typeof argValue !== "undefined"
                    ? argValue
                    : new argType();
            });

            const instance = new Class(...dependencies);
            // Optionally, you can store the instances in a container for later use if needed.
        } else {
            const instance = new Class();
            // Optionally, you can store the instances in a container for later use if needed.
        }
    }
}

// FIXME NOT WORKING YET
export function EnableAutoConfiguration(): Function {
    return async function (target: Function) {
        const rootDir = getProjectRootDirectory();

        const configFile = path.join(rootDir, "nodeBoot-info.json");

        if (fs.existsSync(configFile)) {
            const configContent = fs.readFileSync(configFile, "utf-8");
            const config = JSON.parse(configContent);

            /*if (config.NodeBootExpressApplication) {
              requireFiles(rootDir, [config.NodeBootExpressApplication]);
            }*/

            /* if (config.NodeBootKoaApplication) {
               requireFiles(rootDir, [config.NodeBootKoaApplication]);
             }*/

            if (config.Configurations && Array.isArray(config.Configurations)) {
                await instantiateClasses(rootDir, config.Configurations);
            }

            if (
                config.ConfigurationProperties &&
                Array.isArray(config.ConfigurationProperties)
            ) {
                await instantiateClasses(
                    rootDir,
                    config.ConfigurationProperties,
                );
            }

            if (config.Controllers && Array.isArray(config.Controllers)) {
                await instantiateClasses(rootDir, config.Controllers);
            }

            if (
                config.JsonControllers &&
                Array.isArray(config.JsonControllers)
            ) {
                await instantiateClasses(rootDir, config.JsonControllers);
            }

            if (config.Services && Array.isArray(config.Services)) {
                await instantiateClasses(rootDir, config.Services);
            }
        } else {
            console.error(
                "nodeBoot-info.json not found in the root directory.",
            );
        }
    };
}
