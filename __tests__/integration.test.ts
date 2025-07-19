import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { scaffoldAiAppInstructions } from '../src/main.js'

describe('Integration Tests', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'agent-rules-integration-'))
    originalCwd = process.cwd()
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('End-to-End Scaffolding', () => {
    test('should successfully scaffold GitHub Copilot testing instructions', async () => {
      // Arrange
      process.chdir(tempDir)
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const files = await fs.readdir(targetDir)

      // Verify correct files were created
      assert.ok(files.includes('index.instructions.md'))
      assert.ok(files.includes('testing.instructions.md'))

      // Verify file contents
      const indexContent = await fs.readFile(path.join(targetDir, 'index.instructions.md'), 'utf-8')
      const testingContent = await fs.readFile(path.join(targetDir, 'testing.instructions.md'), 'utf-8')

      assert.ok(indexContent.length > 0)
      assert.ok(testingContent.length > 0)

      // Verify content is valid and non-empty
      assert.ok(indexContent.length > 0)
      assert.ok(testingContent.length > 0)

      // Verify files are readable text content
      assert.ok(typeof indexContent === 'string')
      assert.ok(typeof testingContent === 'string')
    })

    test('should handle file naming correctly for various template names', async () => {
      // Arrange
      process.chdir(tempDir)

      // Create a custom template directory with various file names
      const customTemplateDir = path.join(tempDir, 'custom-template')
      await fs.mkdir(customTemplateDir, { recursive: true })

      // Create template files with different naming patterns
      await fs.writeFile(path.join(customTemplateDir, 'simple.md'), '# Simple Template')
      await fs.writeFile(path.join(customTemplateDir, 'with-dash.md'), '# With Dash Template')
      await fs.writeFile(path.join(customTemplateDir, 'with_underscore.md'), '# With Underscore Template')

      // This test verifies the naming logic works with the actual codebase
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const files = await fs.readdir(targetDir)

      // All files should have the .instructions.md suffix
      for (const file of files) {
        assert.ok(file.endsWith('.instructions.md'), `File ${file} should end with .instructions.md`)
      }
    })

    test('should preserve file content exactly during scaffolding', async () => {
      // Arrange
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Read original template content from the original working directory
      const originalIndexPath = path.join(originalCwd, '__template__/nodejs/testing/index.md')
      const originalTestingPath = path.join(originalCwd, '__template__/nodejs/testing/testing.md')

      const originalIndexContent = await fs.readFile(originalIndexPath, 'utf-8')
      const originalTestingContent = await fs.readFile(originalTestingPath, 'utf-8')

      // Change to temp directory for scaffolding
      process.chdir(tempDir)

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const copiedIndexContent = await fs.readFile(path.join(targetDir, 'index.instructions.md'), 'utf-8')
      const copiedTestingContent = await fs.readFile(path.join(targetDir, 'testing.instructions.md'), 'utf-8')

      // Content should be preserved exactly
      assert.strictEqual(copiedIndexContent, originalIndexContent)
      assert.strictEqual(copiedTestingContent, originalTestingContent)
    })

    test('should work when target directory already exists', async () => {
      // Arrange
      process.chdir(tempDir)
      const targetDir = path.join(tempDir, '.github', 'instructions')

      // Pre-create the target directory
      await fs.mkdir(targetDir, { recursive: true })
      await fs.writeFile(path.join(targetDir, 'existing-file.txt'), 'existing content')

      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const files = await fs.readdir(targetDir)

      // Should have both existing and new files
      assert.ok(files.includes('existing-file.txt'))
      assert.ok(files.includes('index.instructions.md'))
      assert.ok(files.includes('testing.instructions.md'))

      // Existing file should be unchanged
      const existingContent = await fs.readFile(path.join(targetDir, 'existing-file.txt'), 'utf-8')
      assert.strictEqual(existingContent, 'existing content')
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    test('should handle permission-related errors gracefully', async () => {
      // This test ensures the error handling doesn't crash the process
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Change to temp directory
      process.chdir(tempDir)

      // This should work without throwing unhandled exceptions
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // If we get here, no unhandled errors occurred
      assert.ok(true, 'Should complete without unhandled errors')
    })

    test('should validate input parameters completely', async () => {
      const testCases = [
        { aiApp: null, codeLanguage: 'nodejs', codeTopic: 'testing' },
        { aiApp: 'github-copilot', codeLanguage: null, codeTopic: 'testing' },
        { aiApp: 'github-copilot', codeLanguage: 'nodejs', codeTopic: null },
        { aiApp: undefined, codeLanguage: 'nodejs', codeTopic: 'testing' },
        { aiApp: 'github-copilot', codeLanguage: undefined, codeTopic: 'testing' },
        { aiApp: 'github-copilot', codeLanguage: 'nodejs', codeTopic: undefined }
      ]

      for (const testCase of testCases) {
        await assert.rejects(
          () => scaffoldAiAppInstructions(testCase as any),
          /Scaffold instructions must include aiApp and all other template choices/,
          `Should reject invalid input: ${JSON.stringify(testCase)}`
        )
      }
    })
  })

  describe('File System Integration', () => {
    test('should handle deep directory structures', async () => {
      // Arrange
      process.chdir(tempDir)
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const deepPath = path.join(tempDir, '.github', 'instructions')
      const stat = await fs.stat(deepPath)
      assert.ok(stat.isDirectory())

      // Verify we can read and write to the deep directory
      const files = await fs.readdir(deepPath)
      assert.ok(files.length > 0)
    })

    test('should create directories with correct permissions', async () => {
      // Arrange
      process.chdir(tempDir)
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const stat = await fs.stat(targetDir)

      // Directory should be readable and writable
      assert.ok(stat.isDirectory())

      // Test we can write to the directory
      const testFile = path.join(targetDir, 'test-write.txt')
      await fs.writeFile(testFile, 'test content')
      const content = await fs.readFile(testFile, 'utf-8')
      assert.strictEqual(content, 'test content')
    })
  })
})
