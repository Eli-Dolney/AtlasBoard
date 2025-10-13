import React, { useState, useEffect, useRef } from 'react'
import { searchService, type SearchResult } from '../lib/search'

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectResult: (result: SearchResult) => void
}

export function SearchDialog({ isOpen, onClose, onSelectResult }: SearchDialogProps) {
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
        const searchResults = await searchService.search(query)
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
  }, [query])

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
              placeholder="Search across all boards, tasks, and notes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-lg outline-none"
            />
            <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
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
