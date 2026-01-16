import React, { useRef, useState } from 'react'
import { db } from '../lib/db'
import 'dexie-export-import'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'data' | 'about'>('data')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const blob = await db.export()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. See console for details.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('This will overwrite all current data. Are you sure?')) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setIsImporting(true)
      await db.import(file)
      alert('Import successful! Reloading...')
      window.location.reload()
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed. See console for details.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleResetData = async () => {
    const confirm1 = confirm('⚠️ This will delete ALL your data including boards, tasks, and tables.\n\nThis cannot be undone. Are you sure?')
    if (!confirm1) return

    const confirm2 = confirm('🚨 FINAL WARNING: All data will be permanently deleted.\n\nType "DELETE" in the next prompt to confirm.')
    if (!confirm2) return

    const typed = prompt('Type DELETE to confirm:')
    if (typed !== 'DELETE') {
      alert('Cancelled. Your data is safe.')
      return
    }

    try {
      // Delete all data from all tables
      await db.boards.clear()
      await db.lists.clear()
      await db.tasks.clear()
      await db.tableMetas.clear()
      await db.tableColumns.clear()
      await db.tableRows.clear()
      await db.templates.clear()
      await db.workspaces.clear()

      // Clear the welcome shown flag
      localStorage.removeItem('atlas-welcome-shown')

      alert('All data has been deleted. Reloading...')
      window.location.reload()
    } catch (error) {
      console.error('Reset failed:', error)
      alert('Reset failed. See console for details.')
    }
  }

  const handleShowWelcome = () => {
    localStorage.removeItem('atlas-welcome-shown')
    window.location.reload()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-light)' }}>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'data' 
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' 
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('data')}
          >
            📁 Data & Backup
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'about' 
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' 
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ About
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Backup & Restore */}
              <div>
                <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Backup & Restore
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  Export your entire database to a JSON file or restore from a backup.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleExport}
                    disabled={isExporting || isImporting}
                    className="btn btn-primary flex-1"
                  >
                    {isExporting ? 'Exporting...' : '⬇️ Export'}
                  </button>

                  <button
                    onClick={handleImportClick}
                    disabled={isExporting || isImporting}
                    className="btn btn-secondary flex-1"
                  >
                    {isImporting ? 'Importing...' : '⬆️ Import'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Show Welcome Screen */}
              <div>
                <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Welcome Screen
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  Show the welcome screen with templates again.
                </p>
                <button
                  onClick={handleShowWelcome}
                  className="btn btn-secondary"
                >
                  🎉 Show Welcome Screen
                </button>
              </div>

              {/* Danger Zone */}
              <div 
                className="rounded-lg p-4"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <h3 className="font-medium mb-2 text-red-600">
                  ⚠️ Danger Zone
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Delete all data and start fresh. This is useful if you want to:
                </p>
                <ul className="text-sm mb-4 list-disc list-inside" style={{ color: 'var(--text-tertiary)' }}>
                  <li>Push to GitHub without personal data</li>
                  <li>Start completely fresh</li>
                  <li>Fix database issues</li>
                </ul>
                <button
                  onClick={handleResetData}
                  className="btn btn-danger"
                >
                  🗑️ Delete All Data
                </button>
              </div>

              {/* Storage Info */}
              <div 
                className="rounded-lg p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💾</span>
                  <div>
                    <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      100% Local Storage
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      All your data is stored in your browser using IndexedDB. 
                      Nothing is sent to any server. Your data stays on your device.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* About */}
              <div className="text-center py-4">
                <div 
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-4"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
                >
                  AB
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Atlas Boards
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your personal mind map & productivity hub
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  Version 1.0.0
                </p>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  Features
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: '🧠', text: 'Mind Maps' },
                    { icon: '✅', text: 'Tasks & Kanban' },
                    { icon: '📊', text: 'Tables' },
                    { icon: '📅', text: 'Calendar' },
                    { icon: '📝', text: 'Notes' },
                    { icon: '🔗', text: 'Graph View' },
                    { icon: '🎨', text: 'Templates' },
                    { icon: '💾', text: '100% Local' },
                  ].map(f => (
                    <div key={f.text} className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span>{f.icon}</span>
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* License */}
              <div 
                className="rounded-lg p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  MIT License
                </h4>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  This software is open source and free to use, modify, and distribute.
                </p>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { keys: '⌘K', action: 'Command Menu' },
                    { keys: '⌘B', action: 'Toggle Sidebar' },
                    { keys: 'Tab', action: 'Add Child Node' },
                    { keys: 'Enter', action: 'Add Sibling Node' },
                    { keys: 'Delete', action: 'Delete Selection' },
                    { keys: '⌘Z', action: 'Undo' },
                    { keys: '⇧⌘Z', action: 'Redo' },
                  ].map(s => (
                    <div key={s.keys} className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>{s.action}</span>
                      <kbd 
                        className="px-2 py-1 rounded text-xs font-mono"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
