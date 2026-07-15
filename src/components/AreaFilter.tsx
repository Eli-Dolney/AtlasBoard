import type { Area } from '../lib/db'

export default function AreaFilter({ areas, selected, onChange }: { areas: Area[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  return <div className="area-filter" aria-label="Filter by life area">
    <button className={`area-chip ${selected.length === 0 ? 'active' : ''}`} onClick={() => onChange([])}>👋 All Life</button>
    {areas.filter(a => !a.archived).map(a => <button key={a.id} className={`area-chip ${selected.includes(a.id) ? 'active' : ''}`} style={{ '--area-color': a.color } as React.CSSProperties} onClick={() => toggle(a.id)}>{a.icon} {a.name}</button>)}
  </div>
}
