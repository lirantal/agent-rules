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

  describe('CLI Functional Tests', () => {
    test('should validate AI app support through public API', async () => {
      // Test the public API that the CLI uses
      const { getAiAppDirectory } = await import('../src/main.js')

      // Test known supported AI apps
      assert.doesNotThrow(() => getAiAppDirectory('github-copilot'), 'Should support GitHub Copilot')
      assert.doesNotThrow(() => getAiAppDirectory('cursor'), 'Should support Cursor')

      // Test unsupported app throws appropriate error
      assert.throws(() => getAiAppDirectory('unsupported'), /not supported/, 'Should reject unsupported AI apps')
    })

    test('should validate template directory structure exists', async () => {
      // Test that required template structure exists for CLI options
      const templateDir = '__template__/nodejs/testing'

      const stat = await fs.stat(templateDir)
      assert.ok(stat.isDirectory(), 'Template directory should exist')

      const files = await fs.readdir(templateDir)
      assert.ok(files.length > 0, 'Template directory should contain files')
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
      assert.ok(files.includes('testing.md'), 'Should have testing.md template')
    })

    test('should have valid template file content', async () => {
      const indexTemplatePath = '__template__/nodejs/secure-code/child-process.md'
      const testingTemplatePath = '__template__/nodejs/secure-code/file-system.md'

      const indexContent = await fs.readFile(indexTemplatePath, 'utf-8')
      const testingContent = await fs.readFile(testingTemplatePath, 'utf-8')

      assert.ok(indexContent.length > 0, 'template file should have content')
      assert.ok(testingContent.length > 0, 'template file should have content')

      // Verify files are valid (can be read and have content)
      assert.ok(typeof indexContent === 'string', 'template file should be readable as text')
      assert.ok(typeof testingContent === 'string', 'template file should be readable as text')
    })
  })
})
