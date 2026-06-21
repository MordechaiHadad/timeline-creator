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

## Getting Started

```sh
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | Type checking |
| `npm run lint` | Lint and format check |
| `npm run format` | Auto-format code |

## Tech Stack

SvelteKit 2, Svelte 5, TypeScript, D3.js, Tailwind CSS v4, Vite

## License

AGPL-3.0
