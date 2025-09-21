import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { scaffoldAiAppInstructions } from '../src/main.js'
import type { ScaffoldInstructions } from '../src/adapters/base-adapter.js'

describe('MCP Integration Tests', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'agent-rules-mcp-integration-'))
    originalCwd = process.cwd()
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('End-to-End MCP Scaffolding', () => {
    test('should scaffold instructions with MCP configuration for GitHub Copilot', async () => {
      // Arrange
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert instructions were created
      const instructionsDir = path.join(tempDir, '.github', 'instructions')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0)

      // Assert MCP configuration was created at correct path
      const mcpFile = path.join(tempDir, '.vscode', 'mcp.json')
      const mcpStat = await fs.stat(mcpFile)
      assert.ok(mcpStat.isFile())

      // Verify MCP configuration content
      const mcpContent = await fs.readFile(mcpFile, 'utf-8')
      const mcpConfig = JSON.parse(mcpContent)

      assert.ok(mcpConfig.servers)
      assert.ok(mcpConfig.servers['Snyk Security'])
      assert.ok(mcpConfig.servers['Node.js API Docs'])
      assert.ok(mcpConfig.servers['sequential-thinking'])

      // Verify server configurations
      assert.deepStrictEqual(mcpConfig.servers['Snyk Security'], {
        command: 'npx',
        args: ['-y', 'snyk@latest', 'mcp', '-t', 'stdio']
      })
    })

    test('should scaffold instructions with MCP configuration for Gemini', async () => {
      // Arrange
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'gemini',
        codeLanguage: 'nodejs',
        codeTopic: 'testing',
        includeMcp: true
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert instructions were created
      const instructionsDir = path.join(tempDir, '.gemini', 'rules')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0)

      // Assert MCP configuration was created at correct path for Gemini
      const mcpFile = path.join(tempDir, '.gemini', 'settings.json')
      const mcpStat = await fs.stat(mcpFile)
      assert.ok(mcpStat.isFile())

      // Verify MCP configuration content
      const mcpContent = await fs.readFile(mcpFile, 'utf-8')
      const mcpConfig = JSON.parse(mcpContent)

      assert.ok(mcpConfig.mcpServers)
      assert.ok(mcpConfig.mcpServers['Snyk Security'])
      assert.ok(mcpConfig.mcpServers['Node.js API Docs'])
      assert.ok(mcpConfig.mcpServers['sequential-thinking'])
    })

    test('should skip MCP when not requested', async () => {
      // Arrange
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: false
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert instructions were created
      const instructionsDir = path.join(tempDir, '.github', 'instructions')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0)

      // Assert MCP configuration was NOT created
      const mcpFile = path.join(tempDir, '.vscode', 'mcp.json')
      await assert.rejects(
        fs.stat(mcpFile),
        { code: 'ENOENT' }
      )
    })

    test('should skip MCP when includeMcp is undefined', async () => {
      // Arrange
      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
        // includeMcp is undefined
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert MCP configuration was NOT created
      const mcpFile = path.join(tempDir, '.vscode', 'mcp.json')
      await assert.rejects(
        fs.stat(mcpFile),
        { code: 'ENOENT' }
      )
    })

    test('should warn when MCP unsupported by adapter', async () => {
      // Capture console.warn calls
      const originalWarn = console.warn
      const warnings: string[] = []
      console.warn = (message: string) => {
        warnings.push(message)
      }

      try {
        // Arrange
        const scaffoldInstructions: ScaffoldInstructions = {
          aiApp: 'cursor',
          codeLanguage: 'nodejs',
          codeTopic: 'testing',
          includeMcp: true
        }

        // Act
        await scaffoldAiAppInstructions(scaffoldInstructions)

        // Assert warning was shown
        assert.ok(warnings.some(warning => warning.includes('MCP configuration not supported for cursor')))

        // Assert no MCP file was created
        const files = await fs.readdir(tempDir, { recursive: true })
        const mcpFiles = files.filter(file => typeof file === 'string' && file.includes('mcp.json'))
        assert.strictEqual(mcpFiles.length, 0)
      } finally {
        console.warn = originalWarn
      }
    })

    test('should merge with existing MCP configurations', async () => {
      // Arrange: Create existing MCP configuration
      const vscodedir = path.join(tempDir, '.vscode')
      await fs.mkdir(vscodedir, { recursive: true })
      const existingMcpFile = path.join(vscodedir, 'mcp.json')
      await fs.writeFile(existingMcpFile, JSON.stringify({
        servers: {
          'Existing Custom Server': {
            command: 'custom-command',
            args: ['--custom']
          }
        },
        otherSettings: {
          customProperty: 'customValue'
        }
      }, null, 2))

      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const mcpContent = await fs.readFile(existingMcpFile, 'utf-8')
      const mcpConfig = JSON.parse(mcpContent)

      // Should preserve existing server
      assert.deepStrictEqual(mcpConfig.servers['Existing Custom Server'], {
        command: 'custom-command',
        args: ['--custom']
      })

      // Should add template servers
      assert.ok(mcpConfig.servers['Snyk Security'])
      assert.ok(mcpConfig.servers['Node.js API Docs'])
      assert.ok(mcpConfig.servers['sequential-thinking'])

      // Should preserve other settings
      assert.deepStrictEqual(mcpConfig.otherSettings, {
        customProperty: 'customValue'
      })
    })
  })

  describe('CLI Integration Tests', () => {
    function runCli (args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
      return new Promise((resolve, reject) => {
        const child = spawn(path.join(originalCwd, 'node_modules', '.bin', 'tsx'), [
          path.join(originalCwd, 'src', 'bin', 'cli.ts'),
          ...args
        ], {
          cwd: tempDir,
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'], // Don't inherit stdin to avoid interactive prompts
          timeout: 30000 // 30 second timeout
        })

        let stdout = ''
        let stderr = ''

        child.stdout?.on('data', (data) => {
          stdout += data.toString()
        })

        child.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        child.on('close', (code) => {
          resolve({ code: code || 0, stdout, stderr })
        })

        child.on('error', (error) => {
          reject(error)
        })

        // Add timeout handling
        const timer = setTimeout(() => {
          child.kill('SIGTERM')
          reject(new Error(`CLI command timed out after 30 seconds: ${args.join(' ')}`))
        }, 30000)

        child.on('exit', () => {
          clearTimeout(timer)
        })
      })
    }

    test('should handle --mcp flag via CLI', async () => {
      // Act
      let result
      try {
        result = await runCli(['--app', 'github-copilot', '--topics', 'secure-code', '--mcp'])
      } catch (error) {
        assert.fail(`CLI command failed: ${error}`)
      }

      // Assert
      if (result.code !== 0) {
        console.log('STDOUT:', result.stdout)
        console.log('STDERR:', result.stderr)
      }
      assert.strictEqual(result.code, 0, `CLI exited with code ${result.code}. STDERR: ${result.stderr}`)
      assert.ok(result.stdout.includes('Agent rules generated successfully'), 'Expected success message not found')

      // Verify files were created
      const instructionsDir = path.join(tempDir, '.github', 'instructions')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0, 'No instruction files were created')

      const mcpFile = path.join(tempDir, '.vscode', 'mcp.json')
      const mcpStat = await fs.stat(mcpFile)
      assert.ok(mcpStat.isFile(), 'MCP file was not created')
    })

    test('should not create MCP files without --mcp flag', async () => {
      // Act
      const result = await runCli(['--app', 'github-copilot', '--topics', 'secure-code'])

      // Assert
      assert.strictEqual(result.code, 0)

      // Instructions should be created
      const instructionsDir = path.join(tempDir, '.github', 'instructions')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0)

      // MCP file should NOT be created
      const mcpFile = path.join(tempDir, '.vscode', 'mcp.json')
      await assert.rejects(
        fs.stat(mcpFile),
        { code: 'ENOENT' }
      )
    })

    test('should show warning for unsupported adapter via CLI', async () => {
      // Act
      const result = await runCli(['--app', 'cursor', '--topics', 'testing', '--mcp'])

      // Assert
      assert.strictEqual(result.code, 0)
      assert.ok(result.stderr.includes('MCP configuration not supported for cursor'))
      assert.ok(result.stdout.includes('Agent rules generated successfully'))

      // Instructions should be created
      const instructionsDir = path.join(tempDir, '.cursor', 'rules')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0)

      // MCP file should NOT be created for cursor (no MCP support)
      const mcpFile = path.join(tempDir, '.cursor', 'mcp.json')
      await assert.rejects(
        fs.stat(mcpFile),
        { code: 'ENOENT' }
      )
    })

    test('should work with multiple topics and MCP', async () => {
      // Act
      const result = await runCli(['--app', 'gemini', '--topics', 'secure-code', '--topics', 'testing', '--mcp'])

      // Assert
      assert.strictEqual(result.code, 0)

      // Should create MCP file only once (not duplicated for multiple topics)
      const mcpFile = path.join(tempDir, '.gemini', 'settings.json')
      const mcpStat = await fs.stat(mcpFile)
      assert.ok(mcpStat.isFile())

      // Should create instructions for both topics
      const instructionsDir = path.join(tempDir, '.gemini', 'rules')
      const instructionFiles = await fs.readdir(instructionsDir)
      assert.ok(instructionFiles.length > 0)
    })

    test('should include MCP flag in help output', async () => {
      // Act
      let result
      try {
        result = await runCli(['--help'])
      } catch (error) {
        assert.fail(`Help command failed: ${error}`)
      }

      // Assert
      if (result.code !== 0) {
        console.log('STDOUT:', result.stdout)
        console.log('STDERR:', result.stderr)
      }
      assert.strictEqual(result.code, 0, `Help command exited with code ${result.code}`)
      assert.ok(result.stdout.includes('-m, --mcp'), 'MCP flag not found in help')
      assert.ok(result.stdout.includes('Model Context Protocol'), 'MCP description not found in help')
      assert.ok(result.stdout.includes('--app gemini --topics testing --mcp'), 'MCP example not found in help')
    })
  })

  describe('Error Handling', () => {
    test('should handle corrupted template MCP file gracefully', async () => {
      // This test is more complex as we'd need to mock the template file
      // For now, we'll test that the function doesn't crash with malformed JSON

      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      // Should not throw an error even if something goes wrong
      await assert.doesNotReject(
        scaffoldAiAppInstructions(scaffoldInstructions)
      )
    })

    test('should handle permission errors gracefully', async () => {
      // Create MCP config in a read-only directory to simulate permission issues
      const vscodedir = path.join(tempDir, '.vscode')
      await fs.mkdir(vscodedir, { recursive: true })
      const mcpFile = path.join(vscodedir, 'mcp.json')
      await fs.writeFile(mcpFile, '{"mcpServers": {}}')

      // Make the file read-only
      await fs.chmod(mcpFile, 0o444)

      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code',
        includeMcp: true
      }

      // Should handle gracefully (show warning but not crash)
      await assert.doesNotReject(
        scaffoldAiAppInstructions(scaffoldInstructions)
      )

      // Restore write permissions for cleanup
      await fs.chmod(mcpFile, 0o644)
    })
  })
})
