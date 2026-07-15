import { useState, useEffect, useRef } from 'react'
import { searchService, type SearchResult } from '../lib/search'
import { useAreaSelection } from '../lib/areaSelection'

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectResult: (result: SearchResult) => void
}

export function SearchDialog({ isOpen, onClose, onSelectResult }: SearchDialogProps) {
  const selectedAreas=useAreaSelection()
  const [typeFilter,setTypeFilter]=useState<SearchResult['type']|''>('')
  const [statusFilter,setStatusFilter]=useState('')
  const [dateFilter,setDateFilter]=useState<'any'|'upcoming'|'past'>('any')
  const [tagFilter,setTagFilter]=useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      void searchService.reindex()
    }
  }, [isOpen])

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const now=Date.now()
        const searchResults = await searchService.search(query,{areaIds:selectedAreas,types:typeFilter?[typeFilter]:undefined,statuses:statusFilter?[statusFilter]:undefined,dateFrom:dateFilter==='upcoming'?now:undefined,dateTo:dateFilter==='past'?now:undefined,tags:tagFilter.trim()?[tagFilter.trim()]:undefined})
        setResults(searchResults.slice(0, 20)) // Limit to 20 results
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(performSearch, 150)
    return () => clearTimeout(debounceTimer)
  }, [query,selectedAreas,typeFilter,statusFilter,dateFilter,tagFilter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            onSelectResult(results[selectedIndex])
            onClose()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onClose, onSelectResult])

  if (!isOpen) return null

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'board':
        return '📋'
      case 'task':
        return '✅'
      case 'list':
        return '📝'
      case 'node':
        return '🧠'
      case 'note': return '🗒️'
      case 'doc': return '📄'
      case 'event': return '📅'
      case 'habit': return '🔥'
      case 'goal': return '🎯'
      default:
        return '📄'
    }
  }

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'board':
        return 'Board'
      case 'task':
        return 'Task'
      case 'list':
        return 'List'
      case 'node':
        return 'Node'
      case 'note': return 'Note'
      case 'doc': return 'Document'
      case 'event': return 'Event'
      case 'habit': return 'Habit'
      case 'goal': return 'Goal'
      default:
        return 'Item'
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tasks, events, maps, notes, goals, and more..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-lg outline-none"
            />
            <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          <div className="search-filters"><select className="select" aria-label="Content type" value={typeFilter} onChange={e=>setTypeFilter(e.target.value as SearchResult['type']|'')}><option value="">All content</option><option value="task">Tasks</option><option value="event">Events</option><option value="habit">Habits</option><option value="goal">Goals</option><option value="board">Mind maps</option><option value="node">Map nodes</option><option value="note">Notes</option><option value="doc">Documents</option></select><select className="select" aria-label="Status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Any status</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="done">Done</option><option value="completed">Completed</option><option value="archived">Archived</option></select><select className="select" aria-label="Date" value={dateFilter} onChange={e=>setDateFilter(e.target.value as 'any'|'upcoming'|'past')}><option value="any">Any date</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select><input className="input" aria-label="Tag" value={tagFilter} onChange={e=>setTagFilter(e.target.value)} placeholder="Tag" />{selectedAreas.length>0&&<span className="tag">Area filter active</span>}</div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              Searching...
            </div>
          ) : results.length === 0 && query.trim() ? (
            <div className="p-8 text-center text-gray-500">No results found for "{query}"</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Start typing to search across all your content...
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className={`cursor-pointer p-4 hover:bg-gray-50 ${
                    index === selectedIndex ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    onSelectResult(result)
                    onClose()
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-lg">{getResultIcon(result.type)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate font-medium text-gray-900">{result.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            result.type === 'board'
                              ? 'bg-blue-100 text-blue-800'
                              : result.type === 'task'
                                ? 'bg-green-100 text-green-800'
                                : result.type === 'list'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getResultTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.content && result.content !== result.title && (
                        <p className="line-clamp-2 text-sm text-gray-600">{result.content}</p>
                      )}
                      {result.matches.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          Matches: {result.matches.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">Score: {result.score.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>{results.length > 0 && <>↑↓ Navigate • Enter to select • Esc to close</>}</span>
            <span>{results.length} results</span>
          </div>
        </div>
      </div>
    </div>
  )
}
