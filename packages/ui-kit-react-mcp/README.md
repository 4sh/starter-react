# @4sh/ui-kit-react-mcp

_**English** · [Français](./README.fr.md)_

MCP server for **@4sh/ui-kit-react**, the React flavour of the 4SH Design System. It gives a
coding agent (Claude Code, Claude Desktop, Cursor…) the component catalog, each component's
exact API, its `--ui-*` theming hooks and its Storybook documentation, so the agent stops
guessing names, props and import paths.

**Documentation (Storybook)**: https://4sh.github.io/starter-react/

> ⚠️ Not published yet (`private: true`). See `docs/PUBLISHING.md` at the repository root.
> Until then, run it from the repository (see [Development](#development)).

---

## Tools

| Tool                | Returns                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `list_components`   | The catalog: name, family, import subpath, one-sentence summary. Optional `category` filter.                    |
| `get_component_doc` | Everything needed to use one component: import, API, `--ui-*` hooks, doc sections. `include` narrows the reply. |
| `search_docs`       | Full-text search across the whole documentation (components, tokens, foundations), with Storybook links.        |
| `get_shared_config` | Kit-wide structural settings (focus ring, control stroke, transitions…) and the hook that overrides each one.   |

The API is read from the **TypeScript types** at build time, not from the stories: for each
exported component, its own props with their declared type, allowed values, default, JSDoc
and deprecation, plus the native element that receives the remaining attributes.

`get_component_doc` accepts `ui-button`, `button`, `@4sh/ui-kit-react/ui-button`, or the React
name of any export (`UiTabPanel` leads to `ui-tabs`).

The server also hands the agent short **instructions** on connect: the workflow, the flat
import path (`@4sh/ui-kit-react/ui-<name>`, never the family), the one-time setup
(`styles.css` + `UiThemeProvider`), and how to customise without overriding kit classes.

## Use

Install it next to the kit, **at the same version**: the server documents the kit it was
built with, and announces that version to the MCP client.

```bash
pnpm add -D @4sh/ui-kit-react-mcp
```

Then declare it once, in the project's `.mcp.json`:

```json
{
  "mcpServers": {
    "ui-kit-react": {
      "command": "npx",
      "args": ["--no-install", "ui-kit-react-mcp"]
    }
  }
}
```

`--no-install` makes `npx` fail loudly if the binary is missing, instead of fetching whatever
the registry serves under that name. The server speaks stdio only: it is started locally by
the client and never listens on the network. Node 22 or later.

## Zero runtime dependency

The package is one self-contained ESM file (`dist/index.js`, the MCP SDK, Zod and MiniSearch
inlined) plus its documentation snapshot (`data/`). Nothing is resolved at install time, so
no transitive version escapes your lockfile.

## Development

In the `starter-react` repository:

```bash
pnpm mcp:build   # regenerate the doc, write data/, bundle dist/index.js
pnpm mcp:smoke   # start the built binary over stdio and walk an agent's path
pnpm test        # includes the `mcp` Vitest project (Node, fixture manifest)
```

To point a local client at it before publication, use
`node <repo>/packages/ui-kit-react-mcp/dist/index.js` as the command.

The snapshot is written by `scripts/mcp-assets.build.mjs`: the API from the types
(`scripts/lib/component-api.mjs`), the hooks from the doc manifest (same rule as the
_Theming_ tables in Storybook), and the Storybook search index. It is git-ignored and rebuilt
on every `pnpm mcp:build`, so it can never drift from the code it describes.

## License

Apache-2.0. See `LICENSE`.
