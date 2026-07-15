export type ThemePreference = 'light' | 'dark' | 'system'

export function getStoredTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }
  } catch { /* localStorage may be unavailable in private contexts */ }
  return 'system'
}

export function applyTheme(preference: ThemePreference) {
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const useDark = preference === 'dark' || (preference === 'system' && prefersDark)

  if (preference === 'system') {
    localStorage.removeItem('theme')
  } else {
    localStorage.setItem('theme', preference)
  }

  document.documentElement.classList.toggle('dark', useDark)
}

export function initTheme() {
  applyTheme(getStoredTheme())
}
