Atlas Boards (Local‑Only)

Overview
Atlas Boards is a local‑only mind map, notes, and tasks workspace built with React, TypeScript, React Flow, and Dexie (IndexedDB). No server required.

Features
- Mind map canvas (React Flow): editable nodes, shapes/colors, labeled edges, quick add (Tab/Enter), undo/redo
- Notes (rich text) and Checklists as node types
- Left toolbar (zoom/fit/minimap/dark/present/snap/alignment) and right inspector
- Workspace tools: Tasks (Kanban) and Tables (editable grid), persisted locally
- Export PNG/JSON, Import JSON

Getting Started
1) Prerequisites
- Node.js 18+ and npm

2) Clone
```bash
git clone https://github.com/Eli-Dolney/AtlasBoard.git
cd AtlasBoard
```

3) Install
```bash
npm install
```

4) Run dev (Vite)
```bash
npm run dev
```
Open the printed local URL (typically http://localhost:5173/).

5) Build
```bash
npm run build
```
Artifacts are output to `dist/` (ignored by git).

6) Preview production build
```bash
npm run preview
```

Keyboard Shortcuts (Canvas)
- Tab: add child node
- Enter: add sibling node
- Backspace/Delete: delete selection
- Cmd/Ctrl+Z: undo, Shift+Cmd/Ctrl+Z: redo

Tips
- Use the top bar Tasks/Tables buttons to open the bottom workspace panel
- Use the lightning icon for the Quick Create palette

Project Structure
- src/features/boards: BoardCanvas, nodes, edges, quick palette
- src/features/tasks: Kanban
- src/features/tables: TablesView
- src/lib: Dexie DB and utilities

Local Data & Privacy
- All data is stored locally in your browser via IndexedDB (Dexie). No backend or cloud sync.
- To reset data, clear site data in your browser or bump the Dexie version in `src/lib/db.ts`.

Deploying
- Static hosting works (e.g., GitHub Pages, Netlify, Vercel). Build with `npm run build` and deploy the `dist/` folder.
- If deploying under a subpath (e.g., GitHub Pages project site), set Vite’s `base` in `vite.config.ts` accordingly, for example:
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AtlasBoard/', // replace with your repo name if needed
})
```

Contributing
- Issues and PRs welcome. Please run `npm run lint` before submitting.

License
MIT (local‑only focus).

Removed template notes below for clarity.
