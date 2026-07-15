import { afterEach,describe,expect,it,vi } from 'vitest'
import { consumePendingItem, openAtlasItem } from './navigation'

afterEach(()=>{vi.useRealTimers();localStorage.clear();window.location.hash=''})

describe('cross-feature item navigation',()=>{
  it('persists the target until the destination consumes it',()=>{
    vi.useFakeTimers()
    const listener=vi.fn()
    window.addEventListener('atlas-open-item',listener)
    openAtlasItem('note','n1')
    expect(window.location.hash).toBe('#/notes')
    expect(consumePendingItem('doc')).toBeNull()
    expect(consumePendingItem('note')).toBe('n1')
    expect(consumePendingItem('note')).toBeNull()
    vi.runAllTimers()
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener('atlas-open-item',listener)
  })
})
