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
        const {class: className, path: classPath, arguments: classArguments} = classData;

        // Use dynamic import to handle the class asynchronously.
        const module = require(path.join(rootDir, classPath));
        const Class = module[className];

        const argumentsMetadata = Reflect.getMetadata("design:paramtypes", Class);

        // Check if the class has any constructor arguments (dependencies).
        if (argumentsMetadata && argumentsMetadata.length > 0) {
            const dependencies = argumentsMetadata.map((argType, index) => {
                const argValue = classArguments ? classArguments[index] : undefined;
                return typeof argValue !== "undefined" ? argValue : new argType();
            });

            const instance = new Class(...dependencies);
            // Optionally, you can store the instances in a container for later use if needed.
        } else {
            const instance = new Class();
            // Optionally, you can store the instances in a container for later use if needed.
        }
    }
}
