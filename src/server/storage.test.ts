import { describe, expect, it } from 'vitest'
import { isOriginAllowed, parsePositiveInteger, parseTrustedOrigins } from './config.js'
import { safeStorageName } from './storage.js'

describe('configuration parsing', () => {
  it('parses trusted origins', () => {
    expect(parseTrustedOrigins('https://a.example, http://localhost:5858')).toEqual([
      'https://a.example',
      'http://localhost:5858',
    ])
  })

  it('falls back for invalid positive integers', () => {
    expect(parsePositiveInteger('0', 10)).toBe(10)
    expect(parsePositiveInteger('abc', 10)).toBe(10)
    expect(parsePositiveInteger('12', 10)).toBe(12)
  })

  it('allows wildcard origins', () => {
    expect(isOriginAllowed('https://draw.example', ['*'])).toBe(true)
  })
})

describe('storage names', () => {
  it('removes path traversal characters', () => {
    expect(safeStorageName('../secret.json')).toBe('secret.json')
  })

  it('rejects empty names', () => {
    expect(() => safeStorageName('***')).toThrow('Storage name cannot be empty.')
  })
})
