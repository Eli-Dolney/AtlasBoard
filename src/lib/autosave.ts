export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number
): (...funcArgs: Parameters<T>) => void {
  let timeoutId: number | undefined
  return (...funcArgs: Parameters<T>) => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => fn(...funcArgs), delayMs)
  }
}
