# Fresh start vs. existing app

Any skill that involves scaffolding — server adapters (`nodeboot-server-*`), persistence flavours
(`nodeboot-starter-persistence-*`), or similar — should branch on one question before writing any
code: **is this a brand-new project, or an app that already exists?** Don't skip this check — the
correct first move is different in each case. The concrete skill that links here tells you exactly
which sample to use and which package/file to look for; this doc only covers the generic mechanics.

## Path A — Fresh start (no app yet, or adding a feature that has its own reference sample)

Scaffold by copying the matching `samples/sample-*` project wholesale instead of hand-writing the
entry point, DI wiring, and config from scratch — the sample already has a working, tested
combination of `@EnableDI`, `@EnableComponentScan`, the relevant `NodeBoot.run(...)`/handler or
feature setup, and an `app-config.yaml` shape that matches it.

```sh
npx degit nodejs-boot/node-boot/samples/<sample-dir> <new-app-name>
cd <new-app-name>
pnpm install
```

`degit` pulls just that one subdirectory of the GitHub repo — no full monorepo clone needed. If
`degit` isn't available, fall back to a sparse checkout:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/nodejs-boot/node-boot
cd node-boot && git sparse-checkout set samples/<sample-dir>
```

After copying:

1. **Strip** sample-specific business logic — its demo controllers, models, and seed data are
   placeholders, not part of the thing actually being integrated.
2. **Keep** the entry point file, the `@Enable...()`/DI wiring, the `app-config.yaml` shape, and
   any feature-specific config/data files (e.g. `wrangler.toml`, migration files, seed scripts)
   exactly as the sample has them — that's the part actually being reused.
3. **Rename** `package.json`'s `name`/`description`, and repoint `@nodeboot/*` dependencies at
   published npm versions (the monorepo sample uses a `workspace:*` protocol that only resolves
   inside this repo).
4. Run the skill's own **Validate** command against the copied skeleton _before_ adding real
   domain code, to confirm things boot cleanly first.

## Path B — Existing app (adding to / changing a running project)

Never assume the app's current shape — inspect it first:

1. Find the current entry point/handler (or, for a feature like persistence, the current
   `app-config.yaml` section) to see what's already wired.
2. Check `package.json` for which `@nodeboot/*` package is already a dependency for this concern.
3. **Switching or adding something new:** install the needed package, then wire it in alongside
   what's already there. Existing `@Enable...()` decorators and `@Configuration` classes for other
   concerns are unaffected — carry them over unchanged.
4. **Already using this feature, just need a change:** don't restructure existing files to mirror
   the sample; make the smallest change that satisfies the request, using the sample and the
   package README only as a reference for the correct API shape.
5. Always finish by running the skill's **Validate** step against the user's actual app, not the
   sample project.
