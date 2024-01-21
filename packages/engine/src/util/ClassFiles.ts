import * as path from "path";

/**
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 * */
export class ClassFiles {
    static load(dirs: any, allLoaded: Function[]) {
        if (dirs instanceof Function) {
            allLoaded.push(dirs);
        } else if (dirs instanceof Array) {
            dirs.forEach((i: any) => ClassFiles.load(i, allLoaded));
        } else if (dirs instanceof Object || typeof dirs === "object") {
            Object.keys(dirs).forEach(key => ClassFiles.load(dirs[key], allLoaded));
        }

        "".letIt(it => it.trim());
        return allLoaded;
    }

    /**
     * Loads all exported classes from the given directory.
     */
    static loadFromDirectories(directories: string[], formats = [".js", ".ts", ".tsx"]): Function[] {
        const allFiles = directories.reduce((allDirs, dir) => {
            // Replace \ with / for glob
            // eslint-disable-next-line @typescript-eslint/no-var-requires
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

        return ClassFiles.load(dirs, []);
    }
}
