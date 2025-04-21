/**
 * Script that scan index.d.ts for imports and return errors for any dependency that's
 * missing or incorrect in package.json. Also, figures out what type dependencies are missing, or should be moved between dependency types.
 *
 * <p>
 *   Usage:
 *      ```shell
 *        node check-type-dependencies.js
 *      ```
 * </p>
 * */
import {existsSync, readFileSync} from "fs";
import {resolve as resolvePath} from "path";
// Cba polluting root package.json, we'll have this
import {cyan, green, red, yellow} from "chalk";
import {getPackages, Package} from "@manypkg/get-packages";

async function run() {
    const {packages} = await getPackages(resolvePath("."));

    let hadErrors = false;

    for (const pkg of packages) {
        if (!shouldCheckTypes(pkg)) {
            continue;
        }
        const {errors} = checkTypes(pkg);
        if (errors.length) {
            hadErrors = true;
            console.error(`Incorrect type dependencies in ${yellow(pkg.packageJson.name)}:`);
            for (const error of errors) {
                if (error.name === "WrongDepError") {
                    console.error(`Move from ${red(error.from)} to ${green(error.to)}: ${cyan(error.dep)}`);
                } else if (error.name === "MissingDepError") {
                    console.error(`  Missing a type dependency: ${cyan(error.dep)}`);
                } else {
                    console.error(`  Unknown error, ${red(error)}`);
                }
            }
        }
    }

    if (hadErrors) {
        console.error();
        console.error(red("At least one package had incorrect type dependencies"));

        process.exit(2);
    }
}

function shouldCheckTypes(pkg) {
    return !pkg.private && pkg.packageJson.types && existsSync(resolvePath(pkg.dir, "dist/index.d.ts"));
}

/**
 * Scan index.d.ts for imports and return errors for any dependency that's
 * missing or incorrect in package.json
 */
function checkTypes(pkg: Package) {
    const typeDecl = readFileSync(resolvePath(pkg.dir, "dist/index.d.ts"), "utf8");
    const allDeps = (typeDecl.match(/from '.*'/g) || [])
        .map(match => match.replace(/from '(.*)'/, "$1"))
        .filter(n => !n.startsWith("."));
    const deps = Array.from(new Set(allDeps));

    const errors: any[] = [];
    const typeDeps: string[] = [];
    for (const dep of deps) {
        try {
            const typeDep = findTypesPackage(dep, pkg);
            if (typeDep) {
                typeDeps.push(typeDep);
            }
        } catch (error) {
            errors.push(error);
        }
    }

    errors.push(...findTypeDepErrors(typeDeps, pkg));

    return {errors};
}

/**
 * Find the package used for types. This assumes that types are working is a package
 * can be resolved, it doesn't do any checking of presence of types inside the dep.
 */
function findTypesPackage(dep: string, pkg: {dir: string}) {
    try {
        require.resolve(`@types/${dep}/package.json`, {paths: [pkg.dir]});
        return `@types/${dep}`;
    } catch {
        try {
            require.resolve(dep, {paths: [pkg.dir]});
            return undefined;
        } catch {
            try {
                // Some type-only modules don't have a working main field, so try resolving package.json too
                require.resolve(`${dep}/package.json`, {paths: [pkg.dir]});
                return undefined;
            } catch {
                try {
                    // Finally check if it's just a .d.ts file
                    require.resolve(`${dep}.d.ts`, {paths: [pkg.dir]});
                    return undefined;
                } catch {
                    throw mkErr("MissingDepError", `No types for ${dep}`, {dep});
                }
            }
        }
    }
}

/**
 * Figures out what type dependencies are missing, or should be moved between dep types
 */
function findTypeDepErrors(typeDeps: string[], pkg: Package) {
    const devDeps = mkTypeDepSet(pkg.packageJson.devDependencies);
    const deps = mkTypeDepSet({
        ...pkg.packageJson.dependencies,
        ...pkg.packageJson.peerDependencies,
    });

    const errors: Error[] = [];
    for (const typeDep of typeDeps) {
        if (!deps.has(typeDep)) {
            if (devDeps.has(typeDep)) {
                errors.push(
                    mkErr("WrongDepError", `Should be dep ${typeDep}`, {
                        dep: typeDep,
                        from: "devDependencies",
                        to: "dependencies",
                    }),
                );
            } else {
                errors.push(
                    mkErr("MissingDepError", `No types for ${typeDep}`, {
                        dep: typeDep,
                    }),
                );
            }
        } else {
            deps.delete(typeDep);
        }
    }

    for (const dep of deps) {
        errors.push(
            mkErr("WrongDepError", `Should be dev dep ${dep}`, {
                dep,
                from: "dependencies",
                to: "devDependencies",
            }),
        );
    }

    return errors;
}

function mkTypeDepSet(deps: any) {
    const typeDeps = Object.keys(deps || {}).filter(n => n.startsWith("@types/"));
    return new Set(typeDeps);
}

function mkErr(name: string, msg: string, extra: any) {
    const error = new Error(msg);
    error.name = name;
    Object.assign(error, extra);
    return error;
}

run().catch(error => {
    console.error(error.stack || error);
    process.exit(1);
});
