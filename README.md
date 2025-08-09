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
git clone https://github.com/<your-username>/atlas-boards.git
cd atlas-boards
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

Local Storage
Data is saved to IndexedDB via Dexie in your browser profile. To reset, clear site data in your browser or bump the Dexie version in `src/lib/db.ts`.

License
MIT (local‑only focus).

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
