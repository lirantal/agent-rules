import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import {
  getAiAppDirectory,
  resolveTemplateDirectory,
  scaffoldAiAppInstructions
} from '../src/main.js'

describe('Agent Rules CLI', () => {
  let tempDir: string

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'agent-rules-test-'))
  })

  afterEach(async () => {
    // Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('getAiAppDirectory', () => {
    test('should return correct config for github-copilot', () => {
      const result = getAiAppDirectory('github-copilot')

      assert.deepStrictEqual(result, {
        directory: '.github/instructions',
        filesSuffix: '.instructions.md'
      })
    })

    test('should return correct config for cursor', () => {
      const result = getAiAppDirectory('cursor')

      assert.deepStrictEqual(result, {
        directory: '.cursor/rules',
        filesSuffix: '.mdc'
      })
    })

    test('should throw error for unsupported AI app', () => {
      assert.throws(
        () => getAiAppDirectory('unsupported-app'),
        {
          message: 'AI App "unsupported-app" is not supported.'
        }
      )
    })

    test('should throw error for empty string AI app', () => {
      assert.throws(
        () => getAiAppDirectory(''),
        {
          message: 'AI App "" is not supported.'
        }
      )
    })
  })

  describe('resolveTemplateDirectory', () => {
    test('should resolve template directory for valid inputs', async () => {
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      const result = await resolveTemplateDirectory(scaffoldInstructions)

      assert.ok(result.includes('__template__'))
      assert.ok(result.includes('nodejs'))
      assert.ok(result.includes('testing'))
      assert.ok(path.isAbsolute(result))
    })

    test('should throw error for non-existent template directory', async () => {
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nonexistent',
        codeTopic: 'invalid'
      }

      await assert.rejects(
        () => resolveTemplateDirectory(scaffoldInstructions),
        /Template directory not found:/
      )
    })
  })

  describe('scaffoldAiAppInstructions', () => {
    test('should create target directory and copy template files', async () => {
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Change to temp directory for this test
      const originalCwd = process.cwd()
      process.chdir(tempDir)

      try {
        await scaffoldAiAppInstructions(scaffoldInstructions)

        // Verify target directory was created
        const targetStat = await fs.stat(targetDir)
        assert.ok(targetStat.isDirectory())

        // Verify template files were copied with correct naming
        const files = await fs.readdir(targetDir)
        assert.ok(files.length > 0, 'Should have copied at least one file')

        // Check that files have the correct suffix
        for (const file of files) {
          assert.ok(file.endsWith('.instructions.md'), `File ${file} should end with .instructions.md`)
        }

        // Verify file content was copied correctly
        const indexFile = files.find(f => f.startsWith('index'))
        if (indexFile) {
          const content = await fs.readFile(path.join(targetDir, indexFile), 'utf-8')
          assert.ok(content.length > 0, 'Copied file should have content')
        }
      } finally {
        process.chdir(originalCwd)
      }
    })

    test('should throw error when aiApp is missing', async () => {
      const scaffoldInstructions = {
        aiApp: '',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      await assert.rejects(
        () => scaffoldAiAppInstructions(scaffoldInstructions),
        {
          message: 'Scaffold instructions must include aiApp and all other template choices.'
        }
      )
    })

    test('should throw error when codeLanguage is missing', async () => {
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: '',
        codeTopic: 'testing'
      }

      await assert.rejects(
        () => scaffoldAiAppInstructions(scaffoldInstructions),
        {
          message: 'Scaffold instructions must include aiApp and all other template choices.'
        }
      )
    })

    test('should throw error when codeTopic is missing', async () => {
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: ''
      }

      await assert.rejects(
        () => scaffoldAiAppInstructions(scaffoldInstructions),
        {
          message: 'Scaffold instructions must include aiApp and all other template choices.'
        }
      )
    })

    test('should handle multiple template files correctly', async () => {
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      const originalCwd = process.cwd()
      process.chdir(tempDir)

      try {
        await scaffoldAiAppInstructions(scaffoldInstructions)

        const files = await fs.readdir(targetDir)

        // Should have copied multiple files in the secure-code topic
        const expectedFiles = ['child-process.instructions.md', 'file-system.instructions.md']
        for (const expectedFile of expectedFiles) {
          assert.ok(files.includes(expectedFile), `Should include ${expectedFile}`)
        }
      } finally {
        process.chdir(originalCwd)
      }
    })

    test('should create nested directories if they do not exist', async () => {
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      const originalCwd = process.cwd()
      process.chdir(tempDir)

      try {
        // Ensure .github directory doesn't exist initially
        const githubDir = path.join(tempDir, '.github')
        try {
          await fs.stat(githubDir)
          assert.fail('GitHub directory should not exist initially')
        } catch (error) {
          // Expected - directory should not exist
        }

        await scaffoldAiAppInstructions(scaffoldInstructions)

        // Verify nested directory structure was created
        const targetDir = path.join(tempDir, '.github', 'instructions')
        const targetStat = await fs.stat(targetDir)
        assert.ok(targetStat.isDirectory())
      } finally {
        process.chdir(originalCwd)
      }
    })
  })
})
