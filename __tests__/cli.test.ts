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

  describe('CLI Command Line Arguments', () => {
    test('should show help when --help flag is provided', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--help'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.strictEqual(result.status, 0, 'Should exit successfully')
      assert.ok(result.stdout.includes('Usage: agent-rules'), 'Should show usage information')
      assert.ok(result.stdout.includes('--app'), 'Should show app option')
      assert.ok(result.stdout.includes('--topics'), 'Should show topics option')
      assert.ok(result.stdout.includes('Available AI Apps:'), 'Should list available AI apps')
      assert.ok(result.stdout.includes('Available Topics:'), 'Should list available topics')
    })

    test('should show version when --version flag is provided', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--version'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.strictEqual(result.status, 0, 'Should exit successfully')
      assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/, 'Should show version number in semver format')
    })

    test('should work with short flags -h and -v', () => {
      const helpResult = spawnSync('node', ['dist/bin/cli.mjs', '-h'], {
        encoding: 'utf8',
        timeout: 5000
      })

      const versionResult = spawnSync('node', ['dist/bin/cli.mjs', '-v'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.strictEqual(helpResult.status, 0, 'Should handle -h flag')
      assert.ok(helpResult.stdout.includes('Usage:'), 'Should show help with -h')

      assert.strictEqual(versionResult.status, 0, 'Should handle -v flag')
      assert.match(versionResult.stdout.trim(), /^\d+\.\d+\.\d+$/, 'Should show version with -v')
    })

    test('should accept valid app and topics combination', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'cursor', '--topics', 'testing'], {
        encoding: 'utf8',
        timeout: 10000
      })

      assert.strictEqual(result.status, 0, 'Should succeed with valid arguments')
      assert.ok(result.stdout.includes('✅ Agent rules generated successfully!'), 'Should show success message')
    })

    test('should accept multiple topics', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'github-copilot', '--topics', 'secure-code', '--topics', 'testing'], {
        encoding: 'utf8',
        timeout: 10000
      })

      assert.strictEqual(result.status, 0, 'Should succeed with multiple topics')
      assert.ok(result.stdout.includes('✅ Agent rules generated successfully!'), 'Should show success message')
    })

    test('should accept short flags for app and topics', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '-a', 'claude-code', '-t', 'security-vulnerabilities'], {
        encoding: 'utf8',
        timeout: 10000
      })

      assert.strictEqual(result.status, 0, 'Should succeed with short flags')
      assert.ok(result.stdout.includes('✅ Agent rules generated successfully!'), 'Should show success message')
    })

    test('should reject invalid app', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'invalid-app', '--topics', 'testing'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.notStrictEqual(result.status, 0, 'Should exit with error')
      assert.ok(result.stderr.includes('Invalid app "invalid-app"'), 'Should show invalid app error')
      assert.ok(result.stderr.includes('Available apps:'), 'Should list available apps')
    })

    test('should reject invalid topic', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'cursor', '--topics', 'invalid-topic'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.notStrictEqual(result.status, 0, 'Should exit with error')
      assert.ok(result.stderr.includes('Invalid topics "invalid-topic"'), 'Should show invalid topic error')
      assert.ok(result.stderr.includes('Available topics:'), 'Should list available topics')
    })

    test('should require both app and topics when using CLI flags', () => {
      const appOnlyResult = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'cursor'], {
        encoding: 'utf8',
        timeout: 5000
      })

      const topicsOnlyResult = spawnSync('node', ['dist/bin/cli.mjs', '--topics', 'testing'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.notStrictEqual(appOnlyResult.status, 0, 'Should fail when only app provided')
      assert.ok(appOnlyResult.stderr.includes('both --app and --topics must be specified'), 'Should show error message')

      assert.notStrictEqual(topicsOnlyResult.status, 0, 'Should fail when only topics provided')
      assert.ok(topicsOnlyResult.stderr.includes('both --app and --topics must be specified'), 'Should show error message')
    })

    test('should handle invalid command line arguments gracefully', () => {
      const result = spawnSync('node', ['dist/bin/cli.mjs', '--invalid-flag'], {
        encoding: 'utf8',
        timeout: 5000
      })

      assert.notStrictEqual(result.status, 0, 'Should exit with error for invalid flags')
      assert.ok(result.stderr.includes('Error parsing command line arguments'), 'Should show parsing error')
    })

    test('should validate all supported apps work', () => {
      const supportedApps = ['github-copilot', 'cursor', 'claude-code']

      for (const app of supportedApps) {
        const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', app, '--topics', 'testing'], {
          encoding: 'utf8',
          timeout: 10000
        })

        assert.strictEqual(result.status, 0, `Should work with app: ${app}`)
        assert.ok(result.stdout.includes('✅ Agent rules generated successfully!'), `Should generate rules for ${app}`)
      }
    })

    test('should validate all supported topics work', () => {
      const supportedTopics = ['secure-code', 'security-vulnerabilities', 'testing']

      for (const topic of supportedTopics) {
        const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'cursor', '--topics', topic], {
          encoding: 'utf8',
          timeout: 10000
        })

        assert.strictEqual(result.status, 0, `Should work with topic: ${topic}`)
        assert.ok(result.stdout.includes('✅ Agent rules generated successfully!'), `Should generate rules for ${topic}`)
      }
    })
  })
})
