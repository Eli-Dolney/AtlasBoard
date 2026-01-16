import { type ReactNode } from 'react'

export interface DashboardCardProps {
  id: string
  title: string
  description: string
  icon: ReactNode
  color: string
  stats?: { label: string; value: string | number }[]
  recentItems?: { id: string; title: string; subtitle?: string }[]
  onClick: () => void
}

export function DashboardCard({
  title,
  description,
  icon,
  color,
  stats,
  recentItems,
  onClick,
}: DashboardCardProps) {
  return (
    <div
      className="dashboard-card"
      onClick={onClick}
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="dashboard-card-header">
        <div className="dashboard-card-icon" style={{ background: color }}>
          {icon}
        </div>
        <div className="dashboard-card-info">
          <h3 className="dashboard-card-title">{title}</h3>
          <p className="dashboard-card-description">{description}</p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="dashboard-card-stats">
          {stats.map((stat, i) => (
            <div key={i} className="dashboard-card-stat">
              <span className="dashboard-card-stat-value">{stat.value}</span>
              <span className="dashboard-card-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {recentItems && recentItems.length > 0 && (
        <div className="dashboard-card-recent">
          <div className="dashboard-card-recent-title">Recent</div>
          {recentItems.slice(0, 3).map(item => (
            <div key={item.id} className="dashboard-card-recent-item">
              <span className="dashboard-card-recent-item-title">{item.title}</span>
              {item.subtitle && (
                <span className="dashboard-card-recent-item-subtitle">{item.subtitle}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-card-arrow">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M7 4l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
