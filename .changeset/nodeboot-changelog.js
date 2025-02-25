const {default: defaultChangelogFunctions} = require("@changesets/cli/changelog");

// Custom CHANGELOG generation for changesets, stolen from here with one minor change:
// https://github.com/atlassian/changesets/blob/main/packages/cli/src/changelog/index.ts
async function getDependencyReleaseLine(changesets, dependenciesUpdated) {
    if (dependenciesUpdated.length === 0) return "";

    const updatedDepenenciesList = dependenciesUpdated.map(
        dependency => `  - ${dependency.name}@${dependency.newVersion}`,
    );

    // Return one `Updated dependencies` bullet instead of repeating for each changeset; this
    // sacrifices the commit shas for brevity.
    return ["- Updated dependencies", ...updatedDepenenciesList].join("\n");
}

module.exports = {
    getReleaseLine: defaultChangelogFunctions.getReleaseLine,
    getDependencyReleaseLine,
};
