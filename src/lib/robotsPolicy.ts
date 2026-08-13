export type BotAccessState = 'explicitly_allowed' | 'allowed_by_general_rule' | 'explicitly_blocked' | 'unknown'

export function interpretRobotsAccess(content: string, botName: string): BotAccessState {
  if (!content.trim()) return 'unknown'
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = []
  let current: { agents: string[]; allow: string[]; disallow: string[] } | null = null
  let rulesStarted = false
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim().toLowerCase()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const directive = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (directive === 'user-agent') {
      if (!current || rulesStarted) { current = { agents: [], allow: [], disallow: [] }; groups.push(current); rulesStarted = false }
      current.agents.push(value)
    } else if (current && (directive === 'allow' || directive === 'disallow')) {
      rulesStarted = true
      current[directive].push(value)
    }
  }
  const bot = botName.toLowerCase()
  const named = groups.filter(group => group.agents.includes(bot))
  const selected = named.length ? named : groups.filter(group => group.agents.includes('*'))
  if (!selected.length) return 'allowed_by_general_rule'
  const allowsRoot = selected.some(group => group.allow.some(path => path === '/' || path === '/*'))
  const blocksRoot = selected.some(group => group.disallow.some(path => path === '/' || path === '/*'))
  if (blocksRoot && !allowsRoot) return 'explicitly_blocked'
  return named.length && allowsRoot ? 'explicitly_allowed' : 'allowed_by_general_rule'
}
