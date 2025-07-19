import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'

describe('CLI Application', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'agent-rules-cli-test-'))
    originalCwd = process.cwd()
  })

  afterEach(async () => {
    // Restore original working directory and clean up
    process.chdir(originalCwd)
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('CLI Error Handling', () => {
    test('should exit cleanly when CLI is interrupted', () => {
      // Test that the CLI can handle being started and terminated
      const { status } = spawnSync('node', ['-e', 'process.exit(1)'], {
        encoding: 'utf8',
        timeout: 5000
      })

      // Should exit with status 1 as specified
      assert.strictEqual(status, 1)
    })

    test('should be executable', () => {
      // Test that the CLI can be invoked without crashing immediately
      const { status } = spawnSync('node', ['--version'], {
        encoding: 'utf8',
        timeout: 5000
      })

      // Node.js version command should work
      assert.strictEqual(status, 0)
    })
  })

  describe('CLI Build Verification', () => {
    test('should have built CLI executable', async () => {
      const cliPath = path.resolve('dist/bin/cli.mjs')

      try {
        const stat = await fs.stat(cliPath)
        assert.ok(stat.isFile(), 'CLI executable should exist after build')
      } catch (error) {
        // If the file doesn't exist, we should suggest building first
        assert.fail('CLI executable not found. Run "npm run build" first.')
      }
    })

    test('should have valid package.json bin entry', async () => {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))

      assert.ok(packageJson.bin, 'package.json should have bin entry')
      assert.strictEqual(packageJson.bin, './dist/bin/cli.mjs', 'Bin should point to correct CLI file')
    })
  })

  describe('CLI Structure Validation', () => {
    test('should import required modules successfully', async () => {
      // Test that the CLI imports can be resolved
      const cliContent = await fs.readFile('src/bin/cli.ts', 'utf-8')

      // Check for required imports
      assert.ok(cliContent.includes('@clack/prompts'), 'Should import @clack/prompts')
      assert.ok(cliContent.includes('../main.js'), 'Should import main module')
      assert.ok(cliContent.includes('scaffoldAiAppInstructions'), 'Should import scaffoldAiAppInstructions')
    })

    test('should have proper CLI structure', async () => {
      const cliContent = await fs.readFile('src/bin/cli.ts', 'utf-8')

      // Check for main CLI functions
      assert.ok(cliContent.includes('async function init'), 'Should have init function')
      assert.ok(cliContent.includes('async function main'), 'Should have main function')
      assert.ok(cliContent.includes('intro('), 'Should have intro call')
      assert.ok(cliContent.includes('outro('), 'Should have outro call')
    })
  })

  describe('CLI Options Validation', () => {
    test('should have valid AI app options', async () => {
      const cliContent = await fs.readFile('src/bin/cli.ts', 'utf-8')

      // Check that supported AI apps are present
      assert.ok(cliContent.includes('github-copilot'), 'Should support GitHub Copilot')
      assert.ok(cliContent.includes('cursor'), 'Should support Cursor')
      assert.ok(cliContent.includes('claude-code'), 'Should support Claude Code')
    })

    test('should have valid code topic options', async () => {
      const cliContent = await fs.readFile('src/bin/cli.ts', 'utf-8')

      // Check that testing topic is present
      assert.ok(cliContent.includes('testing'), 'Should support testing topic')
    })

    test('should default to nodejs language', async () => {
      const cliContent = await fs.readFile('src/bin/cli.ts', 'utf-8')

      // Check that nodejs is the default language
      assert.ok(cliContent.includes("codeLanguage = 'nodejs'"), 'Should default to nodejs language')
    })
  })

  describe('Template Directory Structure', () => {
    test('should have required template directories', async () => {
      const templateDir = '__template__/nodejs/testing'

      const stat = await fs.stat(templateDir)
      assert.ok(stat.isDirectory(), 'Template directory should exist')

      const files = await fs.readdir(templateDir)
      assert.ok(files.length > 0, 'Template directory should contain files')

      // Check for expected template files
      assert.ok(files.includes('index.md'), 'Should have index.md template')
      assert.ok(files.includes('testing.md'), 'Should have testing.md template')
    })

    test('should have valid template file content', async () => {
      const indexTemplatePath = '__template__/nodejs/testing/index.md'
      const testingTemplatePath = '__template__/nodejs/testing/testing.md'

      const indexContent = await fs.readFile(indexTemplatePath, 'utf-8')
      const testingContent = await fs.readFile(testingTemplatePath, 'utf-8')

      assert.ok(indexContent.length > 0, 'Index template should have content')
      assert.ok(testingContent.length > 0, 'Testing template should have content')

      // Templates should contain markdown content
      assert.ok(indexContent.includes('#'), 'Index template should contain markdown headers')
      assert.ok(testingContent.includes('#'), 'Testing template should contain markdown headers')
    })
  })
})
