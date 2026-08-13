Yes, `pnpm` and `changesets` **work with `workspace:*` dependencies**, but there are some important considerations to ensure everything functions smoothly.

---

## **How `workspace:*` Works in PNPM**

When you use:

```json
"@nodeboot/context": "workspace:*"
```

PNPM resolves `@nodeboot/context` from within your workspace instead of fetching it from the registry.

**Key benefits of `workspace:*`:**

-   Ensures local packages are always used.
-   Keeps all internal dependencies in sync.
-   Prevents version mismatches.

---

## **How Changesets Handles `workspace:*` Dependencies**

Changesets will:

1. Detect internal changes.
2. Automatically bump **dependent packages** when a change is made to a workspace package.
3. Ensure version updates propagate correctly.

### **Example**

Let's say your monorepo has:

```
/packages/core (version 1.0.0)
/packages/app (depends on @nodeboot/context with "workspace:*")
```

If `packages/core` (which provides `@nodeboot/context`) gets a **minor bump**:

-   Changesets updates `packages/core` to **1.1.0**.
-   Changesets ensures `packages/app` is updated to reference `1.1.0`.

This prevents mismatches where one package is using an outdated version.

---

## **Best Practices for Using `workspace:*` with Changesets**

### **1. Use `workspace:^` Instead of `workspace:*`**

`workspace:*` locks the dependency to **any version inside the workspace**, which can lead to unexpected behaviors.

✅ Instead, prefer:

```json
"@nodeboot/context": "workspace:^"
```

This ensures that `@nodeboot/context` follows semver rules (`^1.0.0` → allows updates to `1.x.x` but not `2.x.x`).

---

### **2. Ensure `updateInternalDependencies` is Set**

In `.changeset/config.json`, confirm:

```json
"updateInternalDependencies": "patch"
```

This makes sure internal dependencies **always get updated** when another workspace package changes.

---

### **3. Verify `pnpm changeset version` Behavior**

Before publishing, run:

```sh
pnpm changeset version
```

Check that:

-   `package.json` versions are updated correctly.
-   `workspace:*` dependencies point to the new versions.

If needed, manually adjust the dependency versions before publishing.

---

### **4. Publish Correctly**

If using a **private monorepo**, use:

```sh
pnpm changeset publish --tag beta
```

For **public packages**, run:

```sh
pnpm changeset publish
```

This ensures the **latest workspace versions** are published.

---

> ## ⚠️ IMPORTANT: First-time publishing of a new package
>
> The primary way to publish packages is through the GitHub Actions [`publish.yml`](.github/workflows/publish.yml) workflow, which authenticates to npm using **OIDC (`id-token: write`)** instead of a static npm token. This trust relationship, however, is configured **per package** on npmjs.com, and npm only lets you configure trusted publishing for a package **that already exists** in the registry.
>
> This creates a bootstrapping problem for **brand-new packages**: there is no way to create the package, configure the GitHub Actions trust relationship, and publish it from CI in one shot — CI will fail with an authentication/permission error because the package doesn't exist yet and no trust relationship can be attached to it.
>
> **Workaround — do this once for every new package before it can ever be released from CI:**
>
> 1. Publish the package **manually from your local CLI** first:
>     ```sh
>     npm publish
>     ```
>     This will prompt browser-based authentication (npm login/OTP) — complete it to let the package publish and get created on the registry.
> 2. Go to the package page on [npmjs.com](https://www.npmjs.com/), open **Settings → Trusted Publisher**, and configure the trust relationship for this repository's `publish.yml` GitHub Actions workflow (same as already done for existing packages).
> 3. From this point on, subsequent releases of that package from the CI/CD pipeline (`pnpm release:publish` in `publish.yml`) will publish successfully via OIDC, with no further manual steps required.
>
> Skipping step 1 (i.e. trying to configure trust before the package exists) is not possible — npm has nothing to attach the trust relationship to yet.

---

## **Summary of Commands**

| Command                  | Description                |
| ------------------------ | -------------------------- |
| `pnpm changeset`         | Creates a new changeset    |
| `pnpm changeset status`  | Shows pending changesets   |
| `pnpm changeset version` | Applies version bumps      |
| `pnpm changeset publish` | Publishes updated packages |

With this setup, **pnpm + Changesets** will properly manage versioning and publishing across your monorepo workspace.

## Handy scripts

The Node-Boot parent `package.jon` provides some scripts to help in the release process by using `pnpm` + `changesets`.

| Command                  | Description                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `pnpm release:changeset` | Creates a new changeset for the monorepo workspaces by detecting changed packages automatically |
| `pnpm release:status`    | Shows pending changesets to be released                                                         |
| `pnpm release:version`   | Applies version bumps for changed packages in the monorepo, according to pending changesets     |
| `pnpm release:publish`   | Publishes updated packages                                                                      |
| `pnpm release`           | Applies version bumps for changed packages in the monorepo and publishes them to NPM            |
