# Atlas Boards — Premium Local Mind Map & Planner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-6366f1)](https://eli-dolney.github.io/AtlasBoard/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

> **Free, privacy-first mind mapping + planner** — tasks, calendar, Kanban, habits, goals, notes, and docs. Everything stays in your browser. No account, no cloud.

**[Try the live demo](https://eli-dolney.github.io/AtlasBoard/)** · **[Run locally](#-quick-start)** · MIT licensed

## 🚀 Overview

Atlas Boards is a powerful, local-only productivity workspace that combines the best of mind mapping, note-taking, task management, and knowledge organization. Built for privacy-conscious users who want professional-grade tools without cloud dependencies.

**🔒 100% Local** • **⚡ Lightning Fast** • **🎨 Beautiful UI** • **🔍 Global Search** • **📝 Rich Notes**

## ✨ Key Features

### 🏠 **Dashboard Home**
- **Unified workspace** with quick access to all features
- **Quick stats** showing active tasks, boards, and productivity metrics
- **Recent activity** feed across all sections
- **Section cards** for quick navigation to Mind Maps, Tasks, Tables, and more
- **One-click access** to start focus sessions and view daily habits

### 🧠 **Advanced Mind Mapping**
- **Interactive canvas** with drag-and-drop nodes and connections
- **Rich node types**: Editable nodes, sticky notes, checklists, Kanban boards, timelines, decision matrices
- **Wikilinks & backlinks** - Create `[[Node Title]]` connections
- **Focus/Hoist mode** - Drill down into subtrees
- **Auto-layout algorithms** - Radial and hierarchical arrangements
- **Shape variations** - Rectangles, circles, ellipses, diamonds, rounded corners

### 📋 **Task Management**
- **Kanban boards** with drag-and-drop columns
- **Gantt/Timeline view** for project planning with task dependencies
- **Calendar integration** with month, week, and day views
- **Task priorities** and due dates
- **Task linking** to boards and notes

### 📊 **Data Management**
- **Tables/Spreadsheets** with customizable columns and data types
- **Gallery view** - Card-based visualization of table data
- **Tags and categories** for organization
- **Export/Import** - JSON backup and restore
- **Full-text search** across all tables

### 🍅 **Focus & Productivity**
- **Pomodoro Timer** - Customizable work/break sessions (15-60 min work, 5-30 min breaks)
- **Focus sessions tracking** with daily, weekly, and monthly statistics
- **Task integration** - Link timer to specific tasks
- **Audio notifications** for session completion
- **Session history** and progress tracking

### 🔥 **Habit Tracking**
- **Daily habits checklist** with time-of-day groupings (Morning, Afternoon, Evening, Anytime)
- **Streak tracking** with visual calendar (GitHub-style contribution graph)
- **Habit logs** with completion history
- **Carry-forward** uncompleted habits to next day
- **Daily reset** and progress visualization

### 🎯 **Goals & Milestones**
- **Goal setting** with target dates and categories (Personal, Work, Health, Learning, Finance)
- **Milestone tracking** with progress indicators
- **Goal status** management (Active, Completed, Paused)
- **Visual progress bars** and completion tracking
- **Milestone celebrations** and achievement tracking

### 📝 **Notes & Documentation**
- **Standalone Notes** - Rich text notes with tags, categories, and search
- **Docs/Wiki System** - Nested page hierarchy with Markdown support
- **Rich text editor** (TipTap) with syntax highlighting
- **Code blocks** with language detection (JavaScript, Python, HTML, CSS, etc.)
- **Task lists** and checklists within notes
- **Text formatting** - Bold, italic, underline, colors, highlights
- **Wikilinks** - Create `[[Page Title]]` connections between docs
- **Backlinks** - See all pages linking to current page
- **Favorites** - Star important pages for quick access
- **Auto-generated table of contents** for long documents

### 📅 **Calendar**
- **Full calendar views** - Month, week, and day views
- **Task integration** - See all tasks with due dates
- **Drag-and-drop scheduling** - Move tasks between dates
- **Event management** - Create and manage calendar events
- **Today indicator** and date navigation

### 🔍 **Global Search**
- **Instant full-text search** across all content (boards, tasks, notes, docs, nodes)
- **Fuzzy matching** with relevance scoring
- **Keyboard shortcut** (Ctrl/Cmd + K)
- **Direct navigation** to found items
- **Search filters** by content type

### 🎨 **Professional Templates**
- **10+ Ready-to-use templates** for different use cases:
  - Academic Hub, Business Framework, Project Management
  - Knowledge Base, Personal Productivity, Decision Making
  - SWOT Analysis, Timeline Planning, Goal Achievement
- **Template gallery** with categories and previews
- **Custom templates** - Save your own board layouts

### 🔗 **Graph View**
- **Visual knowledge graph** showing all connections
- **Node relationships** across boards, tasks, notes, and docs
- **Interactive exploration** of your workspace

## Technical Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS 4 + PostCSS design system
- **Canvas**: React Flow 11 (mind mapping)
- **Rich Text**: TipTap 2 (notes & docs)
- **Database**: Dexie 4 (IndexedDB, 100% local)
- **Search**: MiniSearch (full-text, offline)
- **State**: React hooks + Dexie `useLiveQuery` + custom events

## Quick Start

### Option A: Use instantly (no install)

Open the **[live demo](https://eli-dolney.github.io/AtlasBoard/)** in your browser. Data is saved in that browser only (IndexedDB). Use **Settings → Export** to back up your workspace.

### Option B: Run locally (recommended for daily use)

**Prerequisites:** Node.js 18+ and npm

```bash
git clone https://github.com/Eli-Dolney/AtlasBoard.git
cd AtlasBoard
npm install
npm run dev
```

Open **http://localhost:5173** — your planner, calendar, tasks, and mind maps persist across sessions at this URL.

### Mac one-click launcher

Double-click [`scripts/start-atlas.command`](scripts/start-atlas.command) in Finder. It installs dependencies on first run, starts the dev server, and opens the dashboard. Drag it to your Dock or add it to **Login Items** for daily use.

> **Important:** Local data is tied to `http://localhost:5173`. The live demo and local app use separate storage. Use **Export/Import** in Settings to move data between them.

### Build for production

```bash
npm run build
npm run preview
```

GitHub Pages deploys automatically on push to `main` (see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

## 🎯 Quick Start Guide

See [USAGE.md](USAGE.md) for comprehensive documentation.

### Getting Started

1. **Start the app**: Run `npm run dev` and open http://localhost:5173
2. **Dashboard**: The home page shows quick stats and access to all features
3. **Navigation**: Use the sidebar to switch between different sections
4. **Search**: Press `Ctrl/Cmd + K` to search across all content

### Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Global Search | **Ctrl/Cmd + K** | Open global search dialog |
| Settings | **Ctrl/Cmd + ,** | Open settings modal |
| New Board | **Ctrl/Cmd + B** | Create new mind map board |
| Add Child Node | **Tab** | Create child node below selection |
| Add Sibling Node | **Enter** | Create sibling node next to selection |
| Delete | **Backspace/Delete** | Remove selected nodes/edges |
| Undo | **Ctrl/Cmd + Z** | Undo last action |
| Redo | **Ctrl/Cmd + Shift + Z** | Redo last undone action |
| Quick Create | **Q** | Open quick creation palette |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CommandMenu.tsx      # Global command palette
│   ├── SearchDialog.tsx     # Global search interface
│   ├── SettingsModal.tsx    # Settings and data management
│   ├── PomodoroTimer.tsx    # Focus timer widget
│   ├── RichTextEditor.tsx   # Rich text editor component
│   ├── TaskDetailModal.tsx  # Task detail view
│   └── WelcomeScreen.tsx    # First-time user welcome
├── features/
│   ├── dashboard/      # Dashboard home page
│   │   ├── DashboardPage.tsx
│   │   └── DashboardCard.tsx
│   ├── boards/         # Mind mapping canvas
│   │   ├── BoardCanvas.tsx    # Main canvas component
│   │   ├── EditableNode.tsx   # Editable text nodes
│   │   ├── NoteNode.tsx       # Rich text note nodes
│   │   ├── ChecklistNode.tsx  # Checklist nodes
│   │   ├── KanbanNode.tsx     # Kanban board nodes
│   │   ├── TimelineNode.tsx   # Timeline nodes
│   │   ├── MatrixNode.tsx     # Decision matrix nodes
│   │   ├── LabeledEdge.tsx    # Edge labels
│   │   └── QuickPalette.tsx   # Quick creation menu
│   ├── tasks/          # Task management
│   │   ├── TasksPage.tsx      # Tasks overview
│   │   ├── Kanban.tsx         # Kanban board component
│   │   └── GanttView.tsx      # Gantt chart timeline view
│   ├── tables/         # Spreadsheet functionality
│   │   ├── TablesView.tsx     # Table/grid component
│   │   └── GalleryView.tsx    # Card-based gallery view
│   ├── notes/          # Standalone notes
│   │   └── NotesPage.tsx
│   ├── docs/           # Docs/Wiki system
│   │   └── DocsPage.tsx
│   ├── calendar/       # Calendar views
│   │   └── CalendarPage.tsx
│   ├── focus/          # Focus sessions
│   │   └── FocusPage.tsx
│   ├── habits/         # Habit tracking
│   │   ├── HabitsPage.tsx
│   │   ├── DailyHabitsWidget.tsx
│   │   └── StreakCalendar.tsx
│   ├── goals/          # Goals and milestones
│   │   └── GoalsPage.tsx
│   ├── graph/          # Knowledge graph view
│   │   └── GraphPage.tsx
│   └── templates/      # Template gallery
│       └── TemplatesPage.tsx
└── lib/               # Core utilities
    ├── db.ts          # IndexedDB schema (Dexie)
    ├── search.ts      # Full-text search service
    ├── links.ts       # Wikilink parsing utilities
    ├── events.ts      # Event system for inter-component communication
    ├── autosave.ts    # Auto-save functionality
    └── reminders.ts   # Reminder system
```

## 🔒 Privacy & Security

- **Zero servers** - All data stays on your device
- **IndexedDB storage** - Browser-native database
- **No tracking** - No analytics or telemetry
- **Local file handling** - Export/import your own data
- **Full data ownership** - You control everything

## Deployment

### GitHub Pages (included)

Push to `main` and GitHub Actions builds with `GITHUB_PAGES=true` and deploys to Pages. The app uses hash routing (`#/dashboard`, `#/mind`, etc.) so deep links work without server config.

For other static hosts, run `npm run build` and upload `dist/`. Set `GITHUB_PAGES=true` when building if hosting under a subpath (see [`vite.config.ts`](vite.config.ts)).

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
