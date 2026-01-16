# 🌟 Atlas Boards - Next-Gen Local Productivity Hub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

> **Privacy-First Trello/Miro/Notion Competitor** - Complete local workspace for mind mapping, notes, tasks, and knowledge management. Zero servers, full ownership.

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
