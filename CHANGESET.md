## Creating Changesets

We use [changesets](https://github.com/atlassian/changesets) to help us prepare releases. They help us make sure that every package affected by a change gets a proper version number and an entry in its `CHANGELOG.md`. To make the process of generating releases easy, it helps when contributors include changesets with their pull requests.

### When to use a changeset?

Any time a patch, minor, or major change aligning to [Semantic Versioning](https://semver.org) is made to any published package in `packages/` or `plugins/`, a changeset should be used. It helps to align your change to the [Backstage package versioning policy](https://backstage.io/docs/overview/versioning-policy#package-versioning-policy) for the package you are changing, for example, when to provide additional clarity on deprecation or impacting changes which will then be included into CHANGELOGs.

In general, changesets are only needed for changes to packages within `packages/` or `plugins/` directories, and only for the packages that are not marked as `private`. Changesets are also not needed for changes that do not affect the published version of each package, for example changes to tests or in-line source code comments.

Changesets **are** needed for new packages, as that is what triggers the package to be part of the next release. They are also needed for changes to `README.md` files so that the updates are reflected on the NPM page for the changed package.

### How to create a changeset

1. Run `yarn changeset` from the root of the repo
2. Select which packages you want to include a changeset for
3. Select impact of the change you're introducing. If the package you are changing is at version `0.x`, use `minor` for breaking changes and `patch` otherwise. If the package is at `1.0.0` or higher, use `major` for breaking changes, `minor` for backwards compatible API changes, and `patch` otherwise. See the [Semantic Versioning specification](https://semver.org/#semantic-versioning-specification-semver) for more details.
4. Explain your changes in the generated changeset. See [examples of well written changesets](#writing-changesets).
5. Add generated changeset to Git
6. Push the commit with your changeset to the branch associated with your PR
7. Accept our gratitude for making the release process easier on the maintainers

### Writing changesets

Changesets are an important part of the development process. They are used to generate Changelog entries for all changes to the project. Ultimately, they are read by the end users to learn about important changes and fixes to the project. Some of these fixes might require manual intervention from users so it's important to write changesets that users understand and can take action on.

Here are some important do's and don'ts when writing changesets:

### Changeset messages should describe user-facing behavior in plain language

Changeset messages are read by NodeBoot adopters, not contributors. They should describe what changed from the user's perspective, not how the code was changed internally. Never reference internal implementation details such as function names, class names, variable names, or other code symbols that are not part of the public API. Public API names (exported functions, components, types, etc.) are fine to mention, but internal code structure should not appear in changeset messages.

### Changeset should give a clear description to what has changed

#### Bad

```md
---
"@nodeBoot/example-starter": patch
---

Fixed table layout
```

#### Good

```md
---
"@nodeBoot/example-starter": patch
---

Fixed bug in EntityTable component where table layout did not readjust properly below 1080x768 pixels.
```

### Breaking changes not caught by the type checker should be clearly marked with bold **BREAKING** text

#### Bad

```md
---
"@nodeBoot/example-starter": minor
---

getEntity is now a function that returns a Promise.
```

#### Good

```md
---
"@nodeboot/example-starter": minor
---

**BREAKING** The getEntity function now returns a Promise and **must** be awaited from now on.
```

### Changes to code should include a diff of the files that need updating

#### Bad

```md
---
"@nodeboot/example-starter": patch
---

**BREAKING** The catalogEngine now requires a flux capacitor to be passed.
```

#### Good

````md
---
"@nodeboot/example-starter": patch
---

**BREAKING** The catalog createRouter now requires that a `FluxCapacitor` is
passed to the router.

These changes are **required** to `packages/backend/src/plugins/catalog.ts`

```

```
````
