import { useState } from 'react'

interface Template {
  id: string
  name: string
  description: string
  icon: string
  category: string
  color: string
}

const templates: Template[] = [
  // Life Organization
  {
    id: 'life-dashboard',
    name: 'Life Dashboard',
    description: 'Central hub for all areas of your life',
    icon: '🏠',
    category: 'Life',
    color: '#6366f1'
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Brain Dump',
    description: 'Dump everything in your head, then organize',
    icon: '🧠',
    category: 'Life',
    color: '#8b5cf6'
  },
  {
    id: 'adhd-task-hub',
    name: 'ADHD Task Hub',
    description: 'Simplified task system with visual priorities',
    icon: '⚡',
    category: 'Life',
    color: '#f59e0b'
  },
  // Work & Career
  {
    id: 'work-projects',
    name: 'Work Projects',
    description: 'Organize all your work projects and tasks',
    icon: '💼',
    category: 'Work',
    color: '#3b82f6'
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes Hub',
    description: 'Central place for all meeting notes and action items',
    icon: '📝',
    category: 'Work',
    color: '#06b6d4'
  },
  // School & Learning
  {
    id: 'school-hub',
    name: 'School Homework Hub',
    description: 'Track classes, assignments, and deadlines',
    icon: '📚',
    category: 'School',
    color: '#10b981'
  },
  {
    id: 'study-notes',
    name: 'Study Notes Map',
    description: 'Connect concepts and build knowledge',
    icon: '🎓',
    category: 'School',
    color: '#14b8a6'
  },
  // Creative & Side Projects
  {
    id: 'youtube-content',
    name: 'YouTube Content Planner',
    description: 'Plan videos, scripts, and upload schedule',
    icon: '🎬',
    category: 'Creative',
    color: '#ef4444'
  },
  {
    id: 'side-projects',
    name: 'Side Projects Board',
    description: 'Track all your side projects and ideas',
    icon: '🚀',
    category: 'Creative',
    color: '#f97316'
  },
  // Personal
  {
    id: 'family-life',
    name: 'Family & Home',
    description: 'Family tasks, kids activities, household',
    icon: '👨‍👩‍👧‍👦',
    category: 'Personal',
    color: '#ec4899'
  },
  {
    id: 'goals-vision',
    name: 'Goals & Vision Board',
    description: 'Long-term goals and life vision',
    icon: '🎯',
    category: 'Personal',
    color: '#a855f7'
  },
  // Blank
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start fresh with an empty board',
    icon: '✨',
    category: 'Blank',
    color: '#64748b'
  },
]

const categories = ['Life', 'Work', 'School', 'Creative', 'Personal', 'Blank']

interface WelcomeScreenProps {
  onSelectTemplate: (templateId: string) => void
  onDismiss: () => void
}

export function WelcomeScreen({ onSelectTemplate, onDismiss }: WelcomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Life')
  
  const filteredTemplates = templates.filter(t => t.category === selectedCategory)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
      <div className="w-full max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            >
              AB
            </div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Atlas Boards
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Your personal mind map & productivity hub
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
            All your data stays on your device. No cloud, no tracking.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat 
                  ? 'bg-[var(--brand-primary)] text-white shadow-md' 
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              className="card card-hover p-5 text-left transition-all hover:scale-[1.02]"
              onClick={() => onSelectTemplate(template.id)}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${template.color}20` }}
                >
                  {template.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {template.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Tips for ADHD */}
        <div 
          className="rounded-xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))', border: '1px solid rgba(139, 92, 246, 0.2)' }}
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>⚡</span> Quick Tips for Focus
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-start gap-2">
              <span className="text-lg">🧠</span>
              <div>
                <strong>Brain Dump First</strong>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Get everything out of your head before organizing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🎨</span>
              <div>
                <strong>Color Code Areas</strong>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Use colors to separate life areas visually
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">✅</span>
              <div>
                <strong>One Thing at a Time</strong>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Focus mode hides everything except your current branch
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Skip Button */}
        <div className="text-center">
          <button
            className="text-sm hover:underline"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={onDismiss}
          >
            Skip and start with existing board
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen

