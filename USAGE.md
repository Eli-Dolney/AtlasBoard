# 📖 Atlas Boards - Complete Usage Guide

This guide covers all features of Atlas Boards and how to use them effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Mind Mapping](#mind-mapping)
4. [Task Management](#task-management)
5. [Focus & Productivity](#focus--productivity)
6. [Habit Tracking](#habit-tracking)
7. [Goals & Milestones](#goals--milestones)
8. [Notes](#notes)
9. [Docs & Wiki](#docs--wiki)
10. [Tables & Gallery](#tables--gallery)
11. [Calendar](#calendar)
12. [Templates](#templates)
13. [Data Management](#data-management)
14. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### First Launch

1. **Install dependencies**: Run `npm install` in the project directory
2. **Start the app**: Run `npm run dev` and open http://localhost:5173
3. **Welcome screen**: On first launch, you'll see a welcome screen with an overview
4. **Dashboard**: The app opens to the Dashboard, your central hub

### Navigation

- **Sidebar**: Use the left sidebar to navigate between sections
  - **Workspace**: Dashboard, Mind Maps, Tasks, Tables, Docs
  - **Productivity**: Focus Timer, Habits, Goals
  - **Planning**: Calendar, Timeline, Notes
  - **Explore**: Graph View, Gallery, Templates
- **Command Menu**: Press `Ctrl/Cmd + K` to open the command palette for quick navigation
- **Hash routing**: All navigation uses hash-based routing (e.g., `#/tasks`, `#/mind`)

---

## Dashboard

The Dashboard is your home page, providing an overview of your entire workspace.

### Features

- **Quick Stats**: See at a glance:
  - Active tasks
  - Tasks due soon
  - Overdue tasks
  - Completed tasks today
  - Total boards, tables, notes, and docs

- **Section Cards**: Quick access cards for each major feature:
  - Mind Maps
  - Tasks
  - Tables
  - Graph View
  - Templates
  - Calendar
  - Notes
  - And more...

- **Recent Activity**: View your most recently accessed items across all sections

- **Quick Actions**: 
  - Start a focus session directly from the dashboard
  - View today's habits
  - See active goals

### Usage Tips

- Click any section card to navigate to that feature
- Hover over cards to see recent items
- Use the "Start Focus Session" button for quick productivity sessions

---

## Mind Mapping

Create visual mind maps with nodes, connections, and rich content.

### Creating Nodes

1. **Add child node**: Select a node and press `Tab`
2. **Add sibling node**: Select a node and press `Enter`
3. **Quick palette**: Press `Q` to open the quick creation menu
4. **Insert menu**: Click "Insert" in the toolbar to add different node types

### Node Types

- **Editable Node**: Standard text node with wikilink support
- **Note Node**: Rich text note with full editor
- **Checklist Node**: Task list with checkboxes
- **Kanban Node**: Mini Kanban board
- **Timeline Node**: Timeline with events
- **Matrix Node**: Decision matrix (2x2 grid)

### Editing Nodes

- **Double-click**: Open inline editor for text nodes
- **Inspector panel**: Right-click a node to see properties
- **Node toolbar**: Appears when a node is selected

### Connections

- **Create edge**: Drag from a node's edge handle to another node
- **Label edges**: Double-click an edge to add a label
- **Delete edge**: Select edge and press `Delete` or `Backspace`

### Wikilinks

- **Create link**: Type `[[Node Title]]` in any text node
- **Navigate**: Click a wikilink to jump to that node
- **Backlinks**: See all nodes linking to the current node

### Canvas Controls

- **Pan**: Click and drag the background
- **Zoom**: Use mouse wheel or zoom controls
- **Minimap**: Use the minimap in the bottom-right to navigate large maps
- **Fit view**: Click the fit view button to center all nodes

### Layouts

- **Auto-layout**: Use the layout button to automatically arrange nodes
- **Manual positioning**: Drag nodes to position them manually
- **Snap to grid**: Enable grid snapping for alignment

---

## Task Management

Manage tasks with Kanban boards, Gantt charts, and calendar views.

### Kanban View

1. **Navigate**: Go to Tasks section from sidebar
2. **Columns**: Default columns are "To Do", "In Progress", "Done"
3. **Add task**: Click "+" button in any column
4. **Move tasks**: Drag tasks between columns
5. **Edit task**: Click a task to open the detail modal

### Task Details

- **Title & Description**: Add detailed task information
- **Due date**: Set a due date for the task
- **Priority**: Set priority level (Low, Medium, High)
- **Status**: Change task status
- **Link to board**: Link task to a mind map node
- **Subtasks**: Add subtasks within a task

### Gantt/Timeline View

1. **Navigate**: Go to Timeline section from sidebar or Planning section
2. **View tasks**: See all tasks displayed as horizontal bars
3. **Timeline**: Tasks are positioned by start and due dates
4. **Today marker**: Red line shows today's date
5. **Task bars**: Color-coded by status (To Do, In Progress, Done)

### Task Lists

- **Create list**: Use the "+" button to create a new task list
- **Organize**: Lists help group related tasks
- **Filter**: Filter tasks by list, status, or due date

---

## Focus & Productivity

Use the Pomodoro technique to maintain focus and track productivity.

### Starting a Focus Session

1. **From Dashboard**: Click "Start Focus Session" button
2. **From Focus Page**: Navigate to Focus Timer section
3. **Floating Timer**: The timer appears as a floating widget

### Timer Settings

- **Work durations**: 15, 25, 30, 45, or 60 minutes
- **Break durations**: 5, 10, 15, 20, or 30 minutes
- **Custom durations**: Set your own work and break times
- **Task linking**: Link timer to a specific task

### Timer Controls

- **Start**: Begin the timer
- **Pause**: Pause the current session
- **Reset**: Reset to the beginning
- **Skip**: Skip to break or next work session
- **Close**: Minimize the timer (session continues)

### Focus Statistics

View your focus session history on the Focus page:

- **Today's focus**: Total minutes focused today
- **Weekly focus**: Bar chart showing daily focus time
- **Recent sessions**: List of completed sessions with duration
- **Monthly totals**: Track your monthly productivity

### Audio Notifications

- **Session complete**: Audio notification when work session ends
- **Break complete**: Notification when break ends
- **Customizable**: Enable/disable in timer settings

---

## Habit Tracking

Build and maintain daily habits with streak tracking.

### Creating Habits

1. **Navigate**: Go to Habits section from sidebar
2. **Add habit**: Click "+ Add Habit" button
3. **Set details**:
   - Habit name
   - Time of day (Morning, Afternoon, Evening, Anytime)
   - Description (optional)
4. **Save**: The habit appears in your daily checklist

### Daily Habits View

- **Today tab**: See all habits for today
- **Check off**: Click checkbox to mark habit as complete
- **Progress ring**: Visual indicator of daily completion percentage
- **Time groups**: Habits grouped by time of day

### All Habits View

- **Complete list**: See all your habits (active and archived)
- **Edit**: Click a habit to edit details
- **Archive**: Archive habits you no longer want to track
- **Delete**: Permanently remove a habit

### Streak Tracking

- **Streak calendar**: GitHub-style contribution graph
- **Color intensity**: Darker colors = more habits completed that day
- **Current streak**: See your current consecutive days
- **Longest streak**: Track your personal best

### Habit Logs

- **Automatic logging**: Completion is logged automatically
- **History**: View completion history for each habit
- **Carry-forward**: Uncompleted habits can carry to next day

### Stats View

- **Completion rates**: See percentage of habits completed
- **Streak information**: View current and longest streaks
- **Time analysis**: See which times of day you're most consistent

---

## Goals & Milestones

Set and track goals with milestones and progress tracking.

### Creating Goals

1. **Navigate**: Go to Goals section from sidebar
2. **Add goal**: Click "+ New Goal" button
3. **Set details**:
   - Goal title
   - Description
   - Category (Personal, Work, Health, Learning, Finance, Other)
   - Target date
4. **Save**: Goal appears in your active goals list

### Goal Management

- **Active goals**: See all goals in progress
- **Completed goals**: View achieved goals
- **Filter by category**: Filter goals by category
- **Edit goal**: Click a goal to edit details

### Milestones

- **Add milestone**: Add checkpoints to track progress
- **Mark complete**: Check off completed milestones
- **Progress bar**: Visual progress indicator based on completed milestones
- **Reorder**: Drag to reorder milestones

### Goal Status

- **Active**: Goal is in progress
- **Completed**: Goal has been achieved
- **Paused**: Temporarily paused goal

### Goal Details Panel

- **Full information**: See goal description, category, and target date
- **Milestone list**: View all milestones with completion status
- **Progress tracking**: See percentage complete
- **Edit**: Modify goal details and milestones

---

## Notes

Create standalone notes with rich text, tags, and categories.

### Creating Notes

1. **Navigate**: Go to Notes section from sidebar
2. **Add note**: Click "+ New Note" button
3. **Edit**: Click a note to open the editor

### Rich Text Editor

- **Formatting**: Bold, italic, underline
- **Colors**: Text and highlight colors
- **Code blocks**: Syntax-highlighted code blocks
- **Task lists**: Create checklists within notes
- **Links**: Add hyperlinks

### Organization

- **Tags**: Add tags to categorize notes
- **Categories**: Organize by category
- **Search**: Search notes by content, tags, or title
- **Filter**: Filter by tags or categories

### Note List

- **Grid/List view**: Toggle between views
- **Sort**: Sort by date, title, or category
- **Quick preview**: Hover to see note preview

---

## Docs & Wiki

Create a knowledge base with nested pages, wikilinks, and backlinks.

### Creating Documents

1. **Navigate**: Go to Docs section from sidebar
2. **Add page**: Click "+ New Page" button
3. **Set title**: Enter page title
4. **Choose parent**: Optionally set a parent page for nesting

### Document Structure

- **Nested pages**: Create hierarchical page structure
- **Tree view**: Sidebar shows page hierarchy
- **Expand/collapse**: Click to expand or collapse sections
- **Drag to reorder**: Reorder pages in the tree

### Rich Text Editing

- **Markdown support**: Write in Markdown or use the rich text editor
- **Formatting**: Full formatting toolbar
- **Code blocks**: Syntax highlighting for code
- **Images**: Add images to documents (ready for implementation)

### Wikilinks & Backlinks

- **Create link**: Type `[[Page Title]]` to link to another page
- **Navigate**: Click wikilink to jump to that page
- **Backlinks panel**: See all pages linking to current page
- **Auto-complete**: Wikilink suggestions as you type

### Document Features

- **Favorites**: Star important pages for quick access
- **Table of contents**: Auto-generated TOC for long documents
- **Search**: Full-text search across all documents
- **Icons**: Set custom icons for pages
- **Cover images**: Add cover images to pages

### Document Navigation

- **Breadcrumbs**: See current page path
- **Parent navigation**: Navigate up the hierarchy
- **Sibling pages**: Navigate between sibling pages

---

## Tables & Gallery

Manage structured data with tables and visualize it in gallery view.

### Tables View

1. **Navigate**: Go to Tables section from sidebar
2. **Create table**: Click "+ New Table" button
3. **Add columns**: Define column types (Text, Number, Date, etc.)
4. **Add rows**: Add data rows to the table

### Table Features

- **Column types**: Text, Number, Date, Boolean, Select
- **Sorting**: Click column headers to sort
- **Filtering**: Filter rows by column values
- **Editing**: Click cells to edit
- **Add/delete**: Add or remove rows and columns

### Gallery View

1. **Navigate**: Go to Gallery section from sidebar
2. **Select table**: Choose which table to display
3. **Card layout**: Rows displayed as cards
4. **Customize**: Choose which columns to display on cards

### Gallery Features

- **Card design**: Each row becomes a card
- **Cover images**: Set cover images for cards (ready for implementation)
- **Field selection**: Choose which fields appear on cards
- **Search**: Search cards by content
- **Filter**: Filter cards by column values

---

## Calendar

View and manage tasks and events in calendar format.

### Calendar Views

1. **Navigate**: Go to Calendar section from sidebar
2. **View options**: Switch between Month, Week, and Day views
3. **Task display**: Tasks with due dates appear on the calendar

### Month View

- **Full month**: See entire month at a glance
- **Task indicators**: Dots show days with tasks
- **Click day**: Click a day to see tasks for that day
- **Navigation**: Use arrows to navigate months

### Week View

- **7-day view**: See one week at a time
- **Hourly breakdown**: Tasks positioned by time
- **Drag tasks**: Drag tasks to reschedule
- **Today highlight**: Current day is highlighted

### Day View

- **Single day**: Focus on one day
- **Hourly schedule**: See tasks by hour
- **Add events**: Create new events for the day
- **Task details**: Click tasks to see details

### Task Management

- **Drag to reschedule**: Drag tasks to different dates
- **Quick add**: Click a day to quickly add a task
- **Due dates**: Tasks automatically appear on due date

---

## Templates

Use pre-built templates or create your own.

### Template Gallery

1. **Navigate**: Go to Templates section from sidebar
2. **Browse**: See templates organized by category
3. **Preview**: Hover to see template preview
4. **Use template**: Click to apply template to a new board

### Template Categories

- **Productivity**: Personal productivity templates
- **Business**: Business and project management templates
- **Planning**: Planning and strategy templates
- **Learning**: Educational and learning templates
- **Creative**: Creative thinking templates

### Creating Custom Templates

1. **Create board**: Design your mind map
2. **Save as template**: Use "Save as Template" option
3. **Name and categorize**: Give it a name and category
4. **Share**: Your template appears in the gallery

---

## Data Management

Export, import, and manage your data.

### Export Data

1. **Open settings**: Press `Ctrl/Cmd + ,` or click settings icon
2. **Data & Backup tab**: Go to the Data & Backup section
3. **Export**: Click "Export" button
4. **Download**: JSON file downloads with all your data

### Import Data

1. **Open settings**: Go to Settings modal
2. **Data & Backup tab**: Navigate to Data & Backup
3. **Import**: Click "Import" button
4. **Select file**: Choose your exported JSON file
5. **Confirm**: Confirm to overwrite current data
6. **Reload**: App reloads with imported data

### Data Safety

- **Local storage**: All data stored in browser's IndexedDB
- **No cloud**: Data never leaves your device
- **Backup regularly**: Export data regularly for safety
- **Multiple backups**: Keep multiple backup files

### Reset Data

⚠️ **Warning**: This permanently deletes all data!

1. **Open settings**: Go to Settings
2. **Data & Backup**: Navigate to Data & Backup tab
3. **Reset**: Click "Reset All Data" button
4. **Confirm**: Type "DELETE" to confirm
5. **Reload**: App reloads with empty database

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open global search |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + B` | Create new board |
| `Q` | Open quick creation palette |

### Mind Map Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Add child node |
| `Enter` | Add sibling node |
| `Delete/Backspace` | Delete selected nodes/edges |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Escape` | Deselect all |

### Editor Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + Enter` | Submit/Save |

---

## Tips & Best Practices

### Organization

- **Use tags**: Tag notes and tasks for easy filtering
- **Categories**: Organize goals and habits by category
- **Wikilinks**: Create connections between related content
- **Templates**: Use templates for common structures

### Productivity

- **Daily habits**: Check off habits as you complete them
- **Focus sessions**: Use Pomodoro timer for focused work
- **Goal milestones**: Break large goals into smaller milestones
- **Task priorities**: Set priorities to focus on important tasks

### Data Management

- **Regular backups**: Export data weekly or monthly
- **Multiple backups**: Keep backups in different locations
- **Version naming**: Name backups with dates (e.g., `backup-2024-01-15.json`)

### Performance

- **Large mind maps**: Break very large maps into multiple boards
- **Search**: Use search instead of scrolling through long lists
- **Archive**: Archive old goals and habits to keep lists manageable

---

## Troubleshooting

### Data Not Saving

- **Check browser**: Ensure IndexedDB is enabled
- **Storage space**: Check if browser storage is full
- **Private mode**: Some browsers limit storage in private mode

### Performance Issues

- **Large datasets**: Archive old data if you have thousands of items
- **Browser**: Try a different browser (Chrome, Firefox, Edge)
- **Clear cache**: Clear browser cache if issues persist

### Import/Export Issues

- **File format**: Ensure you're importing a valid JSON file
- **File size**: Very large exports may take time to import
- **Browser compatibility**: Use modern browsers (Chrome, Firefox, Edge, Safari)

### Missing Features

- **Check version**: Ensure you're using the latest code
- **Browser support**: Some features require modern browser APIs
- **Local storage**: Features requiring storage need IndexedDB support

---

## Getting Help

- **GitHub Issues**: Report bugs or request features on GitHub
- **Documentation**: Check this guide for feature documentation
- **Code**: Review the code for implementation details

---

**Happy organizing! 🚀**
