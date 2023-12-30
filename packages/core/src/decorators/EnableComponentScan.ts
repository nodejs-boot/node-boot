import {ApplicationContext, ComponentScanOptions} from "@node-boot/context";
import path from "path";

export function EnableComponentScan(options?: ComponentScanOptions): Function {
    return function () {
        options = options ?? {
            controllerPaths: ["/controllers"],
            middlewarePaths: ["/middlewares"],
            interceptorPaths: ["/interceptors"],
        };

        const srcDir = __dirname.substring(0, __dirname.indexOf("/src")) + "/dist";

        if (options.controllerPaths) {
            ApplicationContext.get().controllerClasses = getClassesFromPaths(options.controllerPaths, srcDir);
        }

        if (options.interceptorPaths) {
            ApplicationContext.get().interceptorClasses = getClassesFromPaths(options.interceptorPaths, srcDir);
        }

        if (options.middlewarePaths) {
            ApplicationContext.get().globalMiddlewares = getClassesFromPaths(options.middlewarePaths, srcDir);
        }
    };
}

function getClassesFromPaths(componentPaths: string[], srcDir: string) {
    const paths = componentPaths.map(componentPath => path.join(srcDir, `${componentPath}/**/*.js`));

    return importClassesFromDirectories(paths);
}

/**
 * Loads all exported classes from the given directory.
 */
export function importClassesFromDirectories(directories: string[], formats = [".js", ".ts", ".tsx"]): Function[] {
    const loadFileClasses = function (exported: any, allLoaded: Function[]) {
        if (exported instanceof Function) {
            allLoaded.push(exported);
        } else if (exported instanceof Array) {
            exported.forEach((i: any) => loadFileClasses(i, allLoaded));
        } else if (exported instanceof Object || typeof exported === "object") {
            Object.keys(exported).forEach(key => loadFileClasses(exported[key], allLoaded));
        }

        return allLoaded;
    };

    const allFiles = directories.reduce((allDirs, dir) => {
        // Replace \ with / for glob
        return allDirs.concat(require("glob").sync(path.normalize(dir).replace(/\\/g, "/")));
    }, [] as string[]);

    const dirs = allFiles
        .filter(file => {
            const dtsExtension = file.substring(file.length - 5, file.length);
            return formats.indexOf(path.extname(file)) !== -1 && dtsExtension !== ".d.ts";
        })
        .map(file => {
            return require(file);
        });

    return loadFileClasses(dirs, []);
}
