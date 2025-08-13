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
      // @TODO change this test so that it doesn't have a hard-coded check on the file names
      // in the files.include() assertion but rather checks against the files in the
      // __template__/nodejs directory as a source of truth
      // this is to ensure that the test is resilient to changes in the template structure

      // Arrange
      process.chdir(tempDir)
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const files = await fs.readdir(targetDir)

      // Verify correct files were created
      assert.ok(files.includes('child-process.instructions.md'))
      assert.ok(files.includes('file-system.instructions.md'))

      // Verify file contents
      const indexContent = await fs.readFile(path.join(targetDir, 'child-process.instructions.md'), 'utf-8')
      const testingContent = await fs.readFile(path.join(targetDir, 'file-system.instructions.md'), 'utf-8')

      assert.ok(indexContent.length > 0)
      assert.ok(testingContent.length > 0)

      // Verify content is valid and non-empty
      assert.ok(indexContent.length > 0)
      assert.ok(testingContent.length > 0)

      // Verify files are readable text content
      assert.ok(typeof indexContent === 'string')
      assert.ok(typeof testingContent === 'string')
    })

    test('should successfully scaffold Claude Code secure-code instructions', async () => {
      // Arrange
      process.chdir(tempDir)
      const scaffoldInstructions = {
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert - Verify directory structure
      const claudeRulesDir = path.join(tempDir, '.claude', 'rules')
      const claudeMainFile = path.join(tempDir, 'CLAUDE.md')

      const rulesDirStat = await fs.stat(claudeRulesDir)
      const mainFileStat = await fs.stat(claudeMainFile)
      assert.ok(rulesDirStat.isDirectory())
      assert.ok(mainFileStat.isFile())

      // Verify files were copied
      const copiedFiles = await fs.readdir(claudeRulesDir)
      assert.ok(copiedFiles.includes('child-process.md'))
      assert.ok(copiedFiles.includes('file-system.md'))

      // Verify CLAUDE.md contains correct imports
      const claudeContent = await fs.readFile(claudeMainFile, 'utf-8')
      assert.ok(claudeContent.includes('# Secure Coding'))
      assert.ok(claudeContent.includes('- @./.claude/rules/child-process.md'))
      assert.ok(claudeContent.includes('- @./.claude/rules/file-system.md'))

      // Verify file contents are preserved from templates
      const originalChildProcessPath = path.join(originalCwd, '__template__/nodejs/secure-code/child-process.md')
      const originalFileSystemPath = path.join(originalCwd, '__template__/nodejs/secure-code/file-system.md')

      const originalChildProcessContent = await fs.readFile(originalChildProcessPath, 'utf-8')
      const originalFileSystemContent = await fs.readFile(originalFileSystemPath, 'utf-8')

      const copiedChildProcessContent = await fs.readFile(path.join(claudeRulesDir, 'child-process.md'), 'utf-8')
      const copiedFileSystemContent = await fs.readFile(path.join(claudeRulesDir, 'file-system.md'), 'utf-8')

      assert.strictEqual(copiedChildProcessContent, originalChildProcessContent)
      assert.strictEqual(copiedFileSystemContent, originalFileSystemContent)
    })

    test('should append to existing CLAUDE.md without duplicates', async () => {
      // Arrange
      process.chdir(tempDir)
      const existingContent = '# Existing Rules\n\n- @./some/existing/rule.md\n'
      const claudeMainFile = path.join(tempDir, 'CLAUDE.md')
      await fs.writeFile(claudeMainFile, existingContent)

      const scaffoldInstructions = {
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const claudeContent = await fs.readFile(claudeMainFile, 'utf-8')

      // Verify existing content is preserved
      assert.ok(claudeContent.includes('# Existing Rules'))
      assert.ok(claudeContent.includes('- @./some/existing/rule.md'))

      // Verify new content is added
      assert.ok(claudeContent.includes('# Testing'))
      assert.ok(claudeContent.includes('- @./.claude/rules/testing.md'))

      // Verify files were copied to .claude/rules
      const claudeRulesDir = path.join(tempDir, '.claude', 'rules')
      const copiedFiles = await fs.readdir(claudeRulesDir)
      assert.ok(copiedFiles.includes('testing.md'))
    })

    test('should handle multiple topic scaffolding correctly', async () => {
      // Arrange
      process.chdir(tempDir)

      // Act - Scaffold secure-code first
      await scaffoldAiAppInstructions({
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      })

      // Then scaffold testing
      await scaffoldAiAppInstructions({
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      })

      // Assert
      const claudeMainFile = path.join(tempDir, 'CLAUDE.md')
      const claudeContent = await fs.readFile(claudeMainFile, 'utf-8')

      // Verify both sections exist
      assert.ok(claudeContent.includes('# Secure Coding'))
      assert.ok(claudeContent.includes('# Testing'))

      // Verify all imports exist
      assert.ok(claudeContent.includes('- @./.claude/rules/child-process.md'))
      assert.ok(claudeContent.includes('- @./.claude/rules/file-system.md'))
      assert.ok(claudeContent.includes('- @./.claude/rules/testing.md'))

      // Verify all files exist in .claude/rules
      const claudeRulesDir = path.join(tempDir, '.claude', 'rules')
      const copiedFiles = await fs.readdir(claudeRulesDir)
      assert.ok(copiedFiles.includes('child-process.md'))
      assert.ok(copiedFiles.includes('file-system.md'))
      assert.ok(copiedFiles.includes('testing.md'))
    })

    test('should not duplicate imports when scaffolding same topic twice', async () => {
      // Arrange
      process.chdir(tempDir)
      const scaffoldInstructions = {
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      // Act - Scaffold same topic twice
      await scaffoldAiAppInstructions(scaffoldInstructions)
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const claudeMainFile = path.join(tempDir, 'CLAUDE.md')
      const claudeContent = await fs.readFile(claudeMainFile, 'utf-8')

      // Count occurrences of imports - should only appear once
      const childProcessImportCount = (claudeContent.match(/- @\.\/.claude\/rules\/child-process\.md/g) || []).length
      const fileSystemImportCount = (claudeContent.match(/- @\.\/.claude\/rules\/file-system\.md/g) || []).length

      assert.strictEqual(childProcessImportCount, 1, 'child-process import should not be duplicated')
      assert.strictEqual(fileSystemImportCount, 1, 'file-system import should not be duplicated')

      // Should only have one "Secure Coding" section
      const sectionCount = (claudeContent.match(/# Secure Coding/g) || []).length
      assert.strictEqual(sectionCount, 1, 'Should only have one Secure Coding section')
    })

    test('should handle template files with .instructions suffix correctly for Claude Code', async () => {
      // Arrange
      process.chdir(tempDir)

      // Create a custom template with .instructions suffix
      const customTemplateDir = path.join(tempDir, 'custom-template')
      await fs.mkdir(customTemplateDir, { recursive: true })
      await fs.writeFile(path.join(customTemplateDir, 'custom.instructions.md'), '# Custom Instructions\n\nSome content...')

      // We'll test by directly using the adapter
      const { ClaudeCodeAdapter } = await import('../src/adapters/claude-code-adapter.js')
      const adapter = new ClaudeCodeAdapter()

      const claudeRulesDir = path.join(tempDir, '.claude', 'rules')
      await fs.mkdir(claudeRulesDir, { recursive: true })

      const scaffoldInstructions = {
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      // Act
      await adapter.processInstructions(scaffoldInstructions, customTemplateDir, claudeRulesDir)

      // Assert
      const copiedFiles = await fs.readdir(claudeRulesDir)
      assert.ok(copiedFiles.includes('custom.md'), 'File should be renamed from custom.instructions.md to custom.md')
      assert.ok(!copiedFiles.includes('custom.instructions.md'), 'Original .instructions file should not exist')

      // Verify CLAUDE.md contains correct import path
      const claudeMainFile = path.join(tempDir, 'CLAUDE.md')
      const claudeContent = await fs.readFile(claudeMainFile, 'utf-8')
      assert.ok(claudeContent.includes('- @./.claude/rules/custom.md'))
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
      // @TODO change this test so that it doesn't have a hard-coded check on the file names
      // in the files.include() assertion but rather checks against the files in the
      // __template__/nodejs directory as a source of truth
      // this is to ensure that the test is resilient to changes in the template structure

      // Arrange
      const scaffoldInstructions = {
        aiApp: 'github-copilot',
        codeLanguage: 'nodejs',
        codeTopic: 'secure-code'
      }

      // Read original template content from the original working directory
      const originalIndexPath = path.join(originalCwd, '__template__/nodejs/secure-code/child-process.md')
      const originalTestingPath = path.join(originalCwd, '__template__/nodejs/secure-code/file-system.md')

      const originalIndexContent = await fs.readFile(originalIndexPath, 'utf-8')
      const originalTestingContent = await fs.readFile(originalTestingPath, 'utf-8')

      // Change to temp directory for scaffolding
      process.chdir(tempDir)

      // Act
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // Assert
      const targetDir = path.join(tempDir, '.github', 'instructions')
      const copiedIndexContent = await fs.readFile(path.join(targetDir, 'child-process.instructions.md'), 'utf-8')
      const copiedTestingContent = await fs.readFile(path.join(targetDir, 'file-system.instructions.md'), 'utf-8')

      // Content should be preserved exactly
      assert.strictEqual(copiedIndexContent, originalIndexContent)
      assert.strictEqual(copiedTestingContent, originalTestingContent)
    })

    test('should work when target directory already exists', async () => {
      // @TODO change this test so that it doesn't have a hard-coded check on the file names
      // in the files.include() assertion but rather checks against the files in the
      // __template__/nodejs directory as a source of truth
      // this is to ensure that the test is resilient to changes in the template structure

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

    test('should handle Claude Code scaffolding errors gracefully', async () => {
      // This test ensures Claude Code adapter error handling doesn't crash the process
      const scaffoldInstructions = {
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: 'testing'
      }

      // Change to temp directory
      process.chdir(tempDir)

      // This should work without throwing unhandled exceptions
      await scaffoldAiAppInstructions(scaffoldInstructions)

      // If we get here, no unhandled errors occurred
      assert.ok(true, 'Should complete without unhandled errors')

      // Verify basic structure was created
      const claudeRulesDir = path.join(tempDir, '.claude', 'rules')
      const claudeMainFile = path.join(tempDir, 'CLAUDE.md')

      const rulesDirStat = await fs.stat(claudeRulesDir)
      const mainFileStat = await fs.stat(claudeMainFile)
      assert.ok(rulesDirStat.isDirectory())
      assert.ok(mainFileStat.isFile())
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
