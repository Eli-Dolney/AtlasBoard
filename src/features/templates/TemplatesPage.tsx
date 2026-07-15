import { useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BoardTemplate } from '../../lib/db'

interface Template {
  id: string
  name: string
  description: string
  icon: string
  category: string
  color: string
  preview?: string
}

const templates: Template[] = [
  // Life Organization
  {
    id: 'life-dashboard',
    name: 'Life Dashboard',
    description: 'Central hub for all areas of your life',
    icon: '🏠',
    category: 'Life',
    color: '#6366f1',
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Brain Dump',
    description: 'Dump everything in your head, then organize',
    icon: '🧠',
    category: 'Life',
    color: '#8b5cf6',
  },
  {
    id: 'adhd-task-hub',
    name: 'ADHD Task Hub',
    description: 'Simplified task system with visual priorities',
    icon: '⚡',
    category: 'Life',
    color: '#f59e0b',
  },
  {
    id: 'goal-planning',
    name: 'Goal Planning',
    description: 'Set and track your personal and professional goals',
    icon: '🎯',
    category: 'Life',
    color: '#10b981',
  },
  // Work & Career
  {
    id: 'work-projects',
    name: 'Work Projects',
    description: 'Organize all your work projects and tasks',
    icon: '💼',
    category: 'Work',
    color: '#3b82f6',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes Hub',
    description: 'Central place for all meeting notes and action items',
    icon: '📝',
    category: 'Work',
    color: '#06b6d4',
  },
  {
    id: 'project-management',
    name: 'Project Management',
    description: 'Full project planning with milestones and tasks',
    icon: '📊',
    category: 'Work',
    color: '#0891b2',
  },
  // School & Learning
  {
    id: 'school-hub',
    name: 'School Homework Hub',
    description: 'Track classes, assignments, and deadlines',
    icon: '📚',
    category: 'School',
    color: '#10b981',
  },
  {
    id: 'study-notes',
    name: 'Study Notes Map',
    description: 'Connect concepts and build knowledge',
    icon: '🎓',
    category: 'School',
    color: '#14b8a6',
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    description: 'Organize and connect your learning materials',
    icon: '📖',
    category: 'School',
    color: '#059669',
  },
  // Creative & Side Projects
  {
    id: 'youtube-content',
    name: 'YouTube Content Planner',
    description: 'Plan videos, scripts, and upload schedule',
    icon: '🎬',
    category: 'Creative',
    color: '#ef4444',
  },
  {
    id: 'side-projects',
    name: 'Side Projects Board',
    description: 'Track all your side projects and ideas',
    icon: '🚀',
    category: 'Creative',
    color: '#f97316',
  },
]

const categories = ['All', 'Life', 'Work', 'School', 'Creative']

interface TemplatesPageProps {
  onSelectTemplate: (templateId: string, templateName?: string) => void
}

const previewBranches: Record<string, string[]> = {
  'life-dashboard': ['Family', 'Personal', 'Work', 'Health'],
  'weekly-planner': ['Brain dump', 'Priorities', 'Schedule', 'Later'],
  'adhd-task-hub': ['Now', 'Next', 'Waiting', 'Ideas'],
  'goal-planning': ['Vision', 'Milestones', 'Habits', 'Review'],
  'work-projects': ['Planning', 'Team', 'Execution', 'Review'],
  'meeting-notes': ['Agenda', 'Notes', 'Decisions', 'Actions'],
  'project-management': ['Scope', 'Timeline', 'Tasks', 'Risks'],
  'school-hub': ['Classes', 'Assignments', 'Schedule', 'Resources'],
  'study-notes': ['Concepts', 'Questions', 'Sources', 'Connections'],
  'knowledge-base': ['Learning', 'Ideas', 'Notes', 'Insights'],
  'youtube-content': ['Ideas', 'Scripts', 'Production', 'Analytics'],
  'side-projects': ['Ideas', 'Active', 'Next steps', 'Archive'],
}

export default function TemplatesPage({ onSelectTemplate }: TemplatesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const customTemplates = useLiveQuery(() => db.templates.reverse().sortBy('createdAt'), [], [])
  const customDetails = (template: BoardTemplate) => {
    try {
      const parsed = JSON.parse(template.data) as { nodes?: unknown[]; edges?: unknown[] }
      return `${parsed.nodes?.length || 0} nodes · ${parsed.edges?.length || 0} connections`
    } catch {
      return 'Saved mind map'
    }
  }

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const groupedTemplates = categories.slice(1).reduce(
    (acc, category) => {
      acc[category] = filteredTemplates.filter(t => t.category === category)
      return acc
    },
    {} as Record<string, Template[]>
  )

  return (
    <div className="templates-page">
      {/* Header */}
      <div className="templates-header">
        <div className="templates-header-content">
          <h1 className="templates-title">Templates</h1>
          <p className="templates-subtitle">
            Get started quickly with pre-built templates for any use case
          </p>
        </div>

        {/* Search */}
        <div className="templates-search">
          <input
            type="text"
            className="input"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="templates-categories">
        {categories.map(category => (
          <button
            key={category}
            className={`templates-category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="templates-content">
        {customTemplates.length > 0 && selectedCategory === 'All' && (
          <div className="templates-section">
            <div className="templates-section-heading">
              <div>
                <h2 className="templates-section-title">Your Templates</h2>
                <p>Reusable maps saved locally from the canvas</p>
              </div>
            </div>
            <div className="templates-grid">
              {customTemplates.map(template => (
                <div key={template.id} className="template-card custom-template-card">
                  <div className="template-card-icon custom-template-icon">✦</div>
                  <div className="template-card-content">
                    <h3 className="template-card-title">{template.name}</h3>
                    <p className="template-card-description">{customDetails(template)}</p>
                    <small>Saved {new Date(template.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div className="template-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onSelectTemplate(template.id, template.name)}
                    >
                      Create New Map
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        const name = prompt('Rename template', template.name)?.trim()
                        if (name) await db.templates.update(template.id, { name })
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-ghost btn-sm danger-text"
                      onClick={async () => {
                        if (confirm(`Delete template “${template.name}”?`))
                          await db.templates.delete(template.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedCategory === 'All' ? (
          // Grouped by category
          Object.entries(groupedTemplates).map(
            ([category, templates]) =>
              templates.length > 0 && (
                <div key={category} className="templates-section">
                  <h2 className="templates-section-title">{category}</h2>
                  <div className="templates-grid">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className="template-card"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <div className="template-card-icon" style={{ background: template.color }}>
                          {template.icon}
                        </div>
                        <div className="template-card-content">
                          <h3 className="template-card-title">{template.name}</h3>
                          <p className="template-card-description">{template.description}</p>
                        </div>
                        <div className="template-card-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={e => {
                              e.stopPropagation()
                              onSelectTemplate(template.id, template.name)
                            }}
                          >
                            Create New Map
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
          )
        ) : (
          // Single category
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="template-card"
                onClick={() => setPreviewTemplate(template)}
              >
                <div className="template-card-icon" style={{ background: template.color }}>
                  {template.icon}
                </div>
                <div className="template-card-content">
                  <h3 className="template-card-title">{template.name}</h3>
                  <p className="template-card-description">{template.description}</p>
                </div>
                <div className="template-card-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => {
                      e.stopPropagation()
                      onSelectTemplate(template.id, template.name)
                    }}
                  >
                    Create New Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No templates found</div>
            <div className="empty-state-description">
              Try adjusting your search or category filter
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div
                  className="template-card-icon"
                  style={{
                    background: previewTemplate.color,
                    width: 48,
                    height: 48,
                    fontSize: '1.5rem',
                  }}
                >
                  {previewTemplate.icon}
                </div>
                <div>
                  <h2 className="modal-title">{previewTemplate.name}</h2>
                  <span className="badge badge-default">{previewTemplate.category}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setPreviewTemplate(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                {previewTemplate.description}
              </p>
              <div
                className="template-map-preview"
                style={{ '--template-color': previewTemplate.color } as CSSProperties}
              >
                <div className="template-preview-center">
                  <span>{previewTemplate.icon}</span>
                  <b>{previewTemplate.name}</b>
                </div>
                <div className="template-preview-branches">
                  {(
                    previewBranches[previewTemplate.id] || ['Ideas', 'Plan', 'Action', 'Review']
                  ).map((branch, index) => (
                    <div key={branch} style={{ '--branch-index': index } as CSSProperties}>
                      <i />
                      <span>{branch}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="template-preview-note">
                Creates a new local map with starter branches. Your current maps stay untouched.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewTemplate(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSelectTemplate(previewTemplate.id, previewTemplate.name)
                  setPreviewTemplate(null)
                }}
              >
                Create New Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
