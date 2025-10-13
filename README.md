# 🌟 Atlas Boards - Next-Gen Local Productivity Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

> **Privacy-First Trello/Miro/Notion Competitor** - Complete local workspace for mind mapping, notes, tasks, and knowledge management. Zero servers, full ownership.

## 🚀 Overview

Atlas Boards is a powerful, local-only productivity workspace that combines the best of mind mapping, note-taking, task management, and knowledge organization. Built for privacy-conscious users who want professional-grade tools without cloud dependencies.

**🔒 100% Local** • **⚡ Lightning Fast** • **🎨 Beautiful UI** • **🔍 Global Search** • **📝 Rich Notes**

## ✨ Key Features

### 🧠 **Advanced Mind Mapping**
- **Interactive canvas** with drag-and-drop nodes and connections
- **Rich node types**: Editable nodes, sticky notes, checklists, Kanban boards, timelines, decision matrices
- **Wikilinks & backlinks** - Create `[[Node Title]]` connections
- **Focus/Hoist mode** - Drill down into subtrees
- **Auto-layout algorithms** - Radial and hierarchical arrangements
- **Shape variations** - Rectangles, circles, ellipses, diamonds, rounded corners

### 📝 **Rich Text Notes**
- **TipTap-powered editor** with syntax highlighting
- **Code blocks** with language detection (JavaScript, Python, HTML, CSS, etc.)
- **Task lists** and checklists within notes
- **Text formatting** - Bold, italic, underline, colors, highlights
- **File attachments** (ready for storage integration)

### 🔍 **Global Search**
- **Instant full-text search** across all content (boards, tasks, notes, nodes)
- **Fuzzy matching** with relevance scoring
- **Keyboard shortcut** (Ctrl/Cmd + K)
- **Direct navigation** to found items

### 📋 **Task Management**
- **Kanban boards** with drag-and-drop columns
- **Time tracking** and recurring tasks (ready for implementation)
- **Task dependencies** and priority levels
- **Calendar integration** (ready for implementation)

### 📊 **Data Management**
- **Tables/Spreadsheets** with formulas and relations
- **Tags and categories** for organization
- **Export/Import** - JSON, CSV, PNG formats
- **Version history** and snapshots

### 🎨 **Professional Templates**
- **10+ Ready-to-use templates** for different use cases:
  - Academic Hub, Business Framework, Project Management
  - Knowledge Base, Personal Productivity, Decision Making
  - SWOT Analysis, Timeline Planning, Goal Achievement

## 🛠️ Technical Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4.0 + PostCSS
- **Canvas**: React Flow 11.x (mind mapping)
- **Rich Text**: TipTap 3.x (advanced editor)
- **Database**: Dexie (IndexedDB wrapper)
- **Search**: MiniSearch (local full-text search)
- **State**: Zustand (lightweight state management)

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/Eli-Dolney/AtlasBoard.git
cd AtlasBoard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## 🎯 Usage Guide

### Mind Mapping Basics

1. **Create nodes**: Click "Insert" → "Node" or press **Tab** (child) / **Enter** (sibling)
2. **Connect nodes**: Drag from node edge to another node
3. **Edit content**: Double-click nodes or use the inspector panel
4. **Navigate**: Use **Ctrl/Cmd + K** for global search

### Rich Notes

- Double-click note nodes to open the rich text editor
- Use formatting toolbar for bold, italic, code blocks, etc.
- Add `[[Node Title]]` for wikilinks between nodes

### Templates

- Click **"Templates ▾"** in the toolbar
- Choose from 10+ professional templates
- Templates auto-arrange with proper spacing

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Add Child | **Tab** | Create child node below selection |
| Add Sibling | **Enter** | Create sibling node next to selection |
| Delete | **Backspace/Delete** | Remove selected nodes/edges |
| Undo | **Ctrl/Cmd + Z** | Undo last action |
| Redo | **Ctrl/Cmd + Shift + Z** | Redo last undone action |
| Search | **Ctrl/Cmd + K** | Open global search |
| Quick Create | **Q** | Open quick creation palette |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CommandMenu.tsx  # Global command palette
│   └── SearchDialog.tsx # Global search interface
├── features/
│   ├── boards/         # Mind mapping canvas
│   │   ├── BoardCanvas.tsx    # Main canvas component
│   │   ├── NoteNode.tsx       # Rich text note nodes
│   │   ├── KanbanNode.tsx     # Kanban board nodes
│   │   ├── TimelineNode.tsx   # Timeline nodes
│   │   ├── MatrixNode.tsx     # Decision matrix nodes
│   │   └── QuickPalette.tsx   # Quick creation menu
│   ├── tasks/          # Task management
│   │   ├── Kanban.tsx        # Kanban board component
│   │   └── TasksPage.tsx     # Tasks overview
│   └── tables/         # Spreadsheet functionality
│       └── TablesView.tsx    # Table/grid component
└── lib/               # Core utilities
    ├── db.ts          # IndexedDB schema (Dexie)
    ├── search.ts      # Full-text search service
    ├── links.ts       # Wikilink parsing utilities
    └── events.ts      # Event system for inter-component communication
```

## 🔒 Privacy & Security

- **Zero servers** - All data stays on your device
- **IndexedDB storage** - Browser-native database
- **No tracking** - No analytics or telemetry
- **Local file handling** - Export/import your own data
- **Full data ownership** - You control everything

## 🚢 Deployment

### Static Hosting (Recommended)

Deploy the `dist/` folder to any static hosting service:

```bash
# Build for production
npm run build

# Deploy dist/ folder to:
# - GitHub Pages
# - Netlify
# - Vercel
# - Any static hosting service
```

### GitHub Pages Setup

For GitHub Pages deployment under a subpath:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AtlasBoard/', // Match your repository name
})
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Run `npm run lint` before submitting PRs
- Follow existing TypeScript patterns
- Add tests for new features
- Update documentation for UI changes

## 📜 License

**MIT License** - See [LICENSE](LICENSE) file for details.

Built with ❤️ for privacy-focused productivity enthusiasts.

---

**Atlas Boards** - Your complete local productivity ecosystem. No servers, no subscriptions, no compromises. 🚀
