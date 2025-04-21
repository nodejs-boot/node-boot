/**
 * This script checks that all local package dependencies within the repo
 * point to the correct version ranges.
 *
 * It can be run with a `--fix` flag to a automatically fix any issues.
 */
import {writeJson} from "fs-extra";
import {satisfies} from "semver";
import {getPackages} from "@manypkg/get-packages";
import {join as joinPath, relative as relativePath, resolve as resolvePath} from "path";

const depTypes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

async function run(args: string | string[]) {
    const shouldFix = args.includes("--fix");
    const rootPath = resolvePath(__dirname, "..");
    const {packages} = await getPackages(rootPath);

    let hadErrors = false;

    const pkgMap = new Map(packages.map(pkg => [pkg.packageJson.name, pkg]));

    for (const pkg of packages) {
        let fixed = false;

        for (const depType of depTypes) {
            const deps = pkg.packageJson[depType];

            for (const [dep, range] of Object.entries(deps || {})) {
                if (range === "" || (range as any).startsWith("link:")) {
                    continue;
                }
                const localPackage = pkgMap.get(dep);
                if (localPackage) {
                    const localVersion = localPackage.packageJson.version;
                    if (!satisfies(localVersion, range as any)) {
                        const path = joinPath(relativePath(rootPath, pkg.dir), "package.json");
                        console.log(
                            `${path} depends on the wrong version of ${dep}: ${range} does not satisfy ${localVersion}`,
                        );
                        hadErrors = true;

                        fixed = true;
                        pkg.packageJson[depType][dep] = `^${localVersion}`;
                    }
                }
            }
        }

        if (shouldFix && fixed) {
            await writeJson(joinPath(pkg.dir, "package.json"), pkg.packageJson, {
                spaces: 2,
            });
        }
    }

    if (!shouldFix && hadErrors) {
        console.error();
        console.error("At least one package has an invalid local dependency");
        console.error("Run `node scripts/verify-local-dependencies.js --fix` to fix");

        process.exit(2);
    }
}

run(process.argv.slice(2)).catch(error => {
    console.error(error.stack || error);
    process.exit(1);
});
