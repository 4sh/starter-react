# Starter React

## Getting Started

```bash
pnpm install     # installs dependencies, generates tokens and the `exports` table
pnpm storybook   # the source of truth, at http://localhost:6006
```

| Command                  | What it does                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `pnpm storybook`         | Storybook (reads the kit's **sources**, hot reload)          |
| `pnpm serve`             | Demo application (consumes the **built package**)            |
| `pnpm kit:build`         | Builds `@4sh/ui-kit-react`                                   |
| `pnpm test`              | Component tests in Chromium (Playwright)                     |
| `pnpm lint:check`        | ESLint, without `--fix`                                      |
| `pnpm typecheck`         | `tsc` across all three projects                              |
| `pnpm tokens:build`      | Regenerates CSS variables from `design-tokens/*.json`        |
| `pnpm docs:config:check` | Guardrail: matches handwritten doc against the code          |

Node: see `.nvmrc`. Package manager: pnpm (version pinned in `package.json`).

## Where to read what

| Topic                                          | File                         |
| ---------------------------------------------- | ---------------------------- |
| **Resumption: status, next task, journal**     | `docs/ROADMAP.md`            |
| **Code conventions**                           | `AGENTS.md`                  |
| Architectural decisions and their rationale    | `docs/DECISIONS.md`          |
| What must remain identical across stacks       | `docs/DUAL-ENGINE.md`        |
| Components done / to do                        | `docs/components-index.md`   |
| Versions, branches, CHANGELOG                  | `docs/VERSIONING.md`         |
| npm publishing                                 | `docs/PUBLISHING.md`         |
| Security and exceptions registry               | `docs/SECURITY-PRACTICES.md` |
| Figma part                                     | `CLAUDE.md`                  |

## Where things are

```
design-tokens/     DTCG tokens (JSON): the local copy of this starter
packages/
  ui-kit-react/    the published package: components + SCSS foundation
  ui-kit-react-cli/  source copy mode (phase 4)
  ui-kit-react-mcp/  MCP server for agents (phase 5)
apps/demo/         demo application + business components
storybook/         config, local addons, global doc
scripts/           tokens pipeline, doc pipeline, guardrails
```

## Status

Bootstrapping. The complete pipeline is in place and verified end-to-end: tokens, SCSS foundation, multi-entry build with generated `exports` table, Storybook, doc generated from SCSS, tests in a real browser: on **one** reference component, `ui-icon`.

What remains is written in `docs/components-index.md` (the components) and `docs/DECISIONS.md` (phases 4 to 6: copy mode, MCP server, parity check).
