import { describe, expect, it } from 'vitest'
import { interpretRobotsAccess } from './robotsPolicy'

describe('interpretRobotsAccess', () => {
  it('specific Yeti allow overrides a general block', () => {
    expect(interpretRobotsAccess('User-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /', 'yeti')).toBe('explicitly_allowed')
  })
  it('a private path is not a root block', () => {
    expect(interpretRobotsAccess('User-agent: Yeti\nDisallow: /private/', 'yeti')).toBe('allowed_by_general_rule')
  })
  it('empty content is unknown rather than blocked', () => {
    expect(interpretRobotsAccess('', 'yeti')).toBe('unknown')
  })
})
