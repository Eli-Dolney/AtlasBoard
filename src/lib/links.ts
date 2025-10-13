export type WikilinkToken = { type: 'text'; value: string } | { type: 'link'; title: string }

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

export function parseWikilinks(input: string): WikilinkToken[] {
  const tokens: WikilinkToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = WIKILINK_RE.exec(input))) {
    const start = match.index
    const end = start + match[0].length
    if (start > lastIndex) tokens.push({ type: 'text', value: input.slice(lastIndex, start) })
    const raw = match[1].trim()
    if (raw.length > 0) tokens.push({ type: 'link', title: raw })
    lastIndex = end
  }
  if (lastIndex < input.length) tokens.push({ type: 'text', value: input.slice(lastIndex) })
  return tokens
}

export function extractOutboundTitles(input: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  WIKILINK_RE.lastIndex = 0
  while ((m = WIKILINK_RE.exec(input))) {
    const t = (m[1] ?? '').trim()
    if (t) out.push(t)
  }
  return out
}
