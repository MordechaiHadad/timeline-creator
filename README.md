# Timeline Creator

A browser-based tool for creating interactive, customizable timelines with support for custom calendar systems.

## Features

- **SVG Timeline Visualization** -- Render events as labeled dots and periods as colored bars on a D3-powered axis
- **Event & Period Management** -- Add, edit, and delete point events and date-range periods with custom labels and colors
- **Custom Calendar Systems** -- Define your own calendar name, epoch offset, year scale, and date precision
- **Zoom & Pan** -- D3-powered zoom with mouse/touch support and reset controls
- **Export to PNG** -- High-resolution PNG export of your timeline
- **Persistent State** -- All data auto-saved to localStorage
- **Collision Avoidance** -- Auto-staggers overlapping labels

## Obsidian embedding

The site can run inside an Obsidian view as an iframe. Append `?embed=obsidian&token=<token>` to the hosted URL and implement the [host protocol](docs/obsidian-plugin-protocol.md). In embed mode the app autosaves every change through the bridge, hides import/export/New, and shows save and conflict state.

For UI work without Obsidian, open `?mockHost=1`. It behaves like an embedded file but stores content in localStorage. During plugin development, point the iframe at `http://localhost:5173/?embed=obsidian&token=<token>`.

## Getting Started

```sh
bun install
bun run dev
```

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `bun run dev`     | Start dev server         |
| `bun run build`   | Production build         |
| `bun run preview` | Preview production build |
| `bun run check`   | Type checking            |
| `bun run lint`    | Lint and format check    |
| `bun run format`  | Auto-format code         |

## Tech Stack

SvelteKit 2, Svelte 5, TypeScript, D3.js, Tailwind CSS v4, Vite

## License

AGPL-3.0
