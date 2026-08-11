# Node-Boot Agent Skills

This directory contains an [Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)-compatible
skill family for developing with (and extending) the
[Node-Boot](https://github.com/nodejs-boot/node-boot) framework. Skills are auto-discovered by
agents (GitHub Copilot CLI, Claude, etc.) by scanning every `SKILL.md`'s YAML frontmatter — the
`description` field is what gets matched against the user's request, so read it before loading a
skill's full body.

**This skill family is meant to be copied into other repositories** — apps built _with_ Node-Boot,
not just this monorepo — so every skill treats the node-boot repo as an external reference, not a
local checkout (see the link convention below).

## Conventions

These conventions keep the family token-efficient and consistent. Follow them when adding a new
skill or editing an existing one.

1. **One directory per skill**, flat under `.agents/skills/<skill-name>/`, containing:
    - `SKILL.md` — required. YAML frontmatter (`name`, `description`) + a short Markdown body.
    - `resources/*.md` — optional. Anything long (full API tables, extended code samples,
      step-by-step authoring guides) that isn't needed to _decide_ whether the skill applies, only
      to _execute_ it. Linked from the body by relative path, not inlined.
2. **Frontmatter rules:**
    - `name` matches the directory name exactly.
    - `description` is written in the **third person**, states **when to use this skill**
      concretely (trigger phrases/keywords a user or agent would naturally use), and is a single
      dense paragraph — this is the only part of the skill loaded during discovery, so it carries
      the most weight per token.
3. **Progressive disclosure / token savings:**
    - Keep `SKILL.md` bodies short — a working target is **under ~150 lines**. If a topic needs more,
      split the extra depth into `resources/` and link it.
    - **Never duplicate** content that already lives in a package `README.md`, `USAGE_GUIDE.md`
      section, or a sample project. Link to it instead of copy-pasting (see link convention below).
      The skill body is a distilled _recipe_ (a minimal example + the decision points), not a copy
      of the docs.
4. **Link convention — two tiers.** A link's correct form depends on what it points at, because
   this skill family gets copied into other repos while the node-boot monorepo does not:
    - **Within the skill family** — one `SKILL.md` linking to another skill's `SKILL.md`, or to its
      _own_ `resources/*.md` — use a **relative path**, e.g.
      `../nodeboot-starter-persistence/SKILL.md` or `resources/authoring-a-starter-skill.md`. The
      whole `.agents/skills/` directory always travels together, so these keep resolving wherever
      it's copied.
    - **Into the node-boot monorepo itself** — a package/starter/server `README.md`,
      `CONTRIBUTING.md`, `USAGE_GUIDE.md`, or any sample project source file — use an **absolute
      GitHub blob URL pinned to `main`**, e.g.
      `https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md`. A
      relative path like `../../../starters/persistence/README.md` only resolves while the skill
      lives inside the node-boot monorepo checkout; it 404s once copied into a consumer app's own
      repo, which is the primary intended use case for this skill family.
5. **Orchestrator → concrete pattern:** families with several members (starters, HTTP servers,
   serverless servers) have a parent "router" skill (e.g. `nodeboot-starters`,
   `nodeboot-servers-http`, `nodeboot-servers-serverless`) whose entire job is:
    - understand intent (which starter / which framework / which cloud),
    - state a one-line "use when" for each concrete option,
    - tell the agent exactly which concrete skill directory to open next.
      Orchestrators **never** inline framework-specific detail — that belongs in the concrete skill.
      This keeps the always-scanned frontmatter (and the router body itself) tiny, so an agent only
      ever loads the one concrete skill it actually needs.
6. **Close the loop:** every concrete (non-orchestrator) skill ends with a short **Validate**
   section naming the exact command (usually a `pnpm` script) and/or sample project an agent can
   use to confirm a change actually works.
7. **Adding a new skill:** if it's a new starter package, follow
   [`nodeboot-starters/resources/authoring-a-starter-skill.md`](nodeboot-starters/resources/authoring-a-starter-skill.md)
   and register it in `nodeboot-starters/SKILL.md`'s routing table. If it's a new server/serverless
   adapter, mirror the closest existing concrete server skill and register it in the matching
   orchestrator (`nodeboot-servers-http` or `nodeboot-servers-serverless`).

## Inventory

| Skill                         | Role                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `nodeboot-project-type`       | Simple repo vs. monorepo — decide overall project shape before scaffolding anything else          |
| `nodeboot-core`               | `@nodeboot/core` decorator model — the entry point every app starts from                          |
| `nodeboot-best-practices`     | Project conventions distilled across sample apps                                                  |
| `nodeboot-extending-nodeboot` | Contributing to/extending Node-Boot itself (mirrors `CONTRIBUTING.md`)                            |
| `nodeboot-starters`           | Orchestrator → 11 concrete starter skills (persistence further splits into SQL/MongoDB flavours)  |
| `nodeboot-servers-http`       | Orchestrator → 6 concrete HTTP server adapter skills                                              |
| `nodeboot-servers-serverless` | Orchestrator → 5 concrete serverless adapter skills                                               |
| `nodeboot-servers-desktop`    | Placeholder/pioneering guide (no adapters published yet)                                          |
| `nodeboot-runtimes`           | Orchestrator → 2 concrete process-runtime skills (PM2, Platformatic Watt)                         |
| `nodeboot-test-framework`     | Integration testing with `@nodeboot/node-test` — base hooks + router to 5 specialized test skills |
