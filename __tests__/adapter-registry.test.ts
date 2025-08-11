import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AdapterRegistry } from '../src/adapters/adapter-registry.js'

describe('AdapterRegistry Integration', () => {
  it('should list all supported AI apps', () => {
    const supportedApps = AdapterRegistry.getSupportedAiApps()

    assert.ok(Array.isArray(supportedApps))
    assert.ok(supportedApps.includes('github-copilot'))
    assert.ok(supportedApps.includes('cursor'))
    assert.strictEqual(supportedApps.length, 2)
  })

  it('should create correct adapter instances', () => {
    const githubAdapter = AdapterRegistry.getAdapter('github-copilot')
    const cursorAdapter = AdapterRegistry.getAdapter('cursor')

    // Verify configurations
    const githubConfig = githubAdapter.getConfig()
    const cursorConfig = cursorAdapter.getConfig()

    assert.deepStrictEqual(githubConfig, {
      directory: '.github/instructions',
      filesSuffix: '.instructions.md'
    })

    assert.deepStrictEqual(cursorConfig, {
      directory: '.cursor/rules',
      filesSuffix: '.mdc'
    })
  })

  it('should throw error for unsupported AI app', () => {
    assert.throws(
      () => AdapterRegistry.getAdapter('unsupported-app'),
      {
        message: 'AI App "unsupported-app" is not supported.'
      }
    )
  })
})
