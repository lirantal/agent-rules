import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { resolveMcpTemplateDirectory } from '../src/main.js'
import { AdapterRegistry } from '../src/adapters/adapter-registry.js'
import type { ScaffoldInstructions } from '../src/adapters/base-adapter.js'

describe('MCP Configuration Unit Tests', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'agent-rules-mcp-unit-'))
    originalCwd = process.cwd()
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('MCP Template Resolution', () => {
    it('should resolve MCP template directory correctly', async () => {
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      const resolvedPath = await resolveMcpTemplateDirectory(scaffoldInstructions)

      assert.ok(resolvedPath.includes('__template__'))
      assert.ok(resolvedPath.includes('nodejs'))
      assert.ok(resolvedPath.includes('_mcp'))

      // Verify the directory exists and contains mcp.json
      const stat = await fs.stat(resolvedPath)
      assert.ok(stat.isDirectory())

      const mcpFile = path.join(resolvedPath, 'mcp.json')
      const mcpStat = await fs.stat(mcpFile)
      assert.ok(mcpStat.isFile())
    })

    it('should throw error for non-existent language', async () => {
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nonexistent',
        codeTopic: 'secure-code'
      }

      await assert.rejects(
        resolveMcpTemplateDirectory(scaffoldInstructions),
        /MCP template directory not found/
      )
    })
  })

  describe('Adapter MCP Support', () => {
    it('should return correct MCP config for GitHub Copilot', () => {
      const adapter = AdapterRegistry.getAdapter('github-copilot')
      const mcpConfig = adapter.getMcpConfig()

      assert.deepStrictEqual(mcpConfig, {
        filePath: '.vscode/mcp.json',
        mergeKey: 'servers'
      })
    })

    it('should return correct MCP config for Gemini', () => {
      const adapter = AdapterRegistry.getAdapter('gemini')
      const mcpConfig = adapter.getMcpConfig()

      assert.deepStrictEqual(mcpConfig, {
        filePath: '.gemini/settings.json',
        mergeKey: 'mcpServers'
      })
    })

    it('should return null for unsupported adapters', () => {
      const cursorAdapter = AdapterRegistry.getAdapter('cursor')
      const claudeAdapter = AdapterRegistry.getAdapter('claude-code')

      assert.strictEqual(cursorAdapter.getMcpConfig(), null)
      assert.strictEqual(claudeAdapter.getMcpConfig(), null)
    })
  })

  describe('MCP JSON Merging Logic', () => {
    it('should merge MCP servers without conflicts', async () => {
      // Create a mock template MCP configuration
      const templateMcpDir = path.join(tempDir, 'template')
      await fs.mkdir(templateMcpDir, { recursive: true })
      const templateMcpFile = path.join(templateMcpDir, 'mcp.json')
      await fs.writeFile(templateMcpFile, JSON.stringify({
        servers: {
          'Template Server': {
            command: 'template-command',
            args: ['--template']
          }
        }
      }, null, 2))

      // Create existing MCP configuration
      const targetMcpDir = path.join(tempDir, '.vscode')
      await fs.mkdir(targetMcpDir, { recursive: true })
      const targetMcpFile = path.join(targetMcpDir, 'mcp.json')
      await fs.writeFile(targetMcpFile, JSON.stringify({
        servers: {
          'Existing Server': {
            command: 'existing-command',
            args: ['--existing']
          }
        },
        other: {
          setting: 'value'
        }
      }, null, 2))

      // Test the merge logic using GitHub Copilot adapter
      const adapter = AdapterRegistry.getAdapter('github-copilot')
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      await adapter.processMcpConfiguration(scaffoldInstructions, templateMcpDir, tempDir)

      // Verify the merge result
      const mergedContent = await fs.readFile(targetMcpFile, 'utf-8')
      const mergedConfig = JSON.parse(mergedContent)

      // Should preserve existing server
      assert.deepStrictEqual(mergedConfig.servers['Existing Server'], {
        command: 'existing-command',
        args: ['--existing']
      })

      // Should add template server
      assert.deepStrictEqual(mergedConfig.servers['Template Server'], {
        command: 'template-command',
        args: ['--template']
      })

      // Should preserve other settings
      assert.deepStrictEqual(mergedConfig.other, { setting: 'value' })
    })

    it('should handle missing target files gracefully', async () => {
      // Create a mock template MCP configuration
      const templateMcpDir = path.join(tempDir, 'template')
      await fs.mkdir(templateMcpDir, { recursive: true })
      const templateMcpFile = path.join(templateMcpDir, 'mcp.json')
      await fs.writeFile(templateMcpFile, JSON.stringify({
        servers: {
          'New Server': {
            command: 'new-command',
            args: ['--new']
          }
        }
      }, null, 2))

      // Test with non-existent target file
      const adapter = AdapterRegistry.getAdapter('github-copilot')
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      await adapter.processMcpConfiguration(scaffoldInstructions, templateMcpDir, tempDir)

      // Verify the file was created
      const targetMcpFile = path.join(tempDir, '.vscode', 'mcp.json')
      const createdContent = await fs.readFile(targetMcpFile, 'utf-8')
      const createdConfig = JSON.parse(createdContent)

      assert.deepStrictEqual(createdConfig, {
        servers: {
          'New Server': {
            command: 'new-command',
            args: ['--new']
          }
        }
      })
    })

    it('should preserve existing server configurations when template has same server names', async () => {
      // Create template with same server name as existing
      const templateMcpDir = path.join(tempDir, 'template')
      await fs.mkdir(templateMcpDir, { recursive: true })
      const templateMcpFile = path.join(templateMcpDir, 'mcp.json')
      await fs.writeFile(templateMcpFile, JSON.stringify({
        servers: {
          'Shared Server': {
            command: 'template-command',
            args: ['--template']
          }
        }
      }, null, 2))

      // Create existing config with same server name
      const targetMcpDir = path.join(tempDir, '.vscode')
      await fs.mkdir(targetMcpDir, { recursive: true })
      const targetMcpFile = path.join(targetMcpDir, 'mcp.json')
      await fs.writeFile(targetMcpFile, JSON.stringify({
        servers: {
          'Shared Server': {
            command: 'existing-command',
            args: ['--existing']
          }
        }
      }, null, 2))

      const adapter = AdapterRegistry.getAdapter('github-copilot')
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      await adapter.processMcpConfiguration(scaffoldInstructions, templateMcpDir, tempDir)

      // Template should override existing (this is the expected behavior)
      const mergedContent = await fs.readFile(targetMcpFile, 'utf-8')
      const mergedConfig = JSON.parse(mergedContent)

      assert.deepStrictEqual(mergedConfig.servers['Shared Server'], {
        command: 'template-command',
        args: ['--template']
      })
    })

    it('should handle malformed JSON gracefully', async () => {
      // Create valid template
      const templateMcpDir = path.join(tempDir, 'template')
      await fs.mkdir(templateMcpDir, { recursive: true })
      const templateMcpFile = path.join(templateMcpDir, 'mcp.json')
      await fs.writeFile(templateMcpFile, JSON.stringify({
        servers: {
          'Valid Server': {
            command: 'valid-command',
            args: ['--valid']
          }
        }
      }, null, 2))

      // Create malformed existing config
      const targetMcpDir = path.join(tempDir, '.vscode')
      await fs.mkdir(targetMcpDir, { recursive: true })
      const targetMcpFile = path.join(targetMcpDir, 'mcp.json')
      await fs.writeFile(targetMcpFile, '{ invalid json }')

      const adapter = AdapterRegistry.getAdapter('github-copilot')
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      // Should not throw error but handle gracefully
      await adapter.processMcpConfiguration(scaffoldInstructions, templateMcpDir, tempDir)

      // Should still write the template config (treating malformed as empty)
      const resultContent = await fs.readFile(targetMcpFile, 'utf-8')
      const resultConfig = JSON.parse(resultContent)

      assert.deepStrictEqual(resultConfig, {
        servers: {
          'Valid Server': {
            command: 'valid-command',
            args: ['--valid']
          }
        }
      })
    })
  })
})
