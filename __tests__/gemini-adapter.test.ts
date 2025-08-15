import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { GeminiAdapter } from '../src/adapters/gemini-adapter.js'
import type { ScaffoldInstructions } from '../src/adapters/base-adapter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter
  let tempDir: string
  let testProjectRoot: string
  let testTargetDir: string
  let testTemplateDir: string

  beforeEach(async () => {
    adapter = new GeminiAdapter()

    // Create temporary directory structure for testing
    tempDir = await fs.mkdtemp(path.join(__dirname, 'temp-gemini-test-'))
    testProjectRoot = tempDir
    testTargetDir = path.join(tempDir, '.gemini', 'rules')
    testTemplateDir = path.join(tempDir, 'templates')

    // Create directories
    await fs.mkdir(testTargetDir, { recursive: true })
    await fs.mkdir(testTemplateDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it('should have correct configuration', () => {
    const config = adapter.getConfig()

    assert.strictEqual(config.directory, '.gemini/rules')
    assert.strictEqual(config.filesSuffix, '.md')
  })

  it('should copy template files to target directory', async () => {
    // Create test template files
    const templateContent = `---
applyTo: "**/*.js"
description: Test template
---

# Test Template

This is a test template for Gemini.`

    await fs.writeFile(path.join(testTemplateDir, 'test-template.md'), templateContent, 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify that the file was copied and frontmatter was stripped
    const targetFilePath = path.join(testTargetDir, 'test-template.md')
    const targetFileExists = await fs.access(targetFilePath).then(() => true).catch(() => false)
    assert.strictEqual(targetFileExists, true)

    const targetContent = await fs.readFile(targetFilePath, 'utf-8')
    assert.strictEqual(targetContent.includes('---'), false, 'Frontmatter should be stripped')
    assert.strictEqual(targetContent.includes('# Test Template'), true, 'Content should be preserved')
    assert.strictEqual(targetContent.includes('This is a test template for Gemini.'), true, 'Content should be preserved')
  })

  it('should strip frontmatter from template files', async () => {
    // Create test template file with frontmatter
    const templateWithFrontmatter = `---
applyTo: "**/*.test.js"
description: Test template with frontmatter
source: https://example.com
---

# Testing Guidelines

This is content after frontmatter.

## Section 1

More content here.`

    await fs.writeFile(path.join(testTemplateDir, 'with-frontmatter.md'), templateWithFrontmatter, 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify that frontmatter was stripped
    const targetFilePath = path.join(testTargetDir, 'with-frontmatter.md')
    const targetContent = await fs.readFile(targetFilePath, 'utf-8')

    // Should not contain frontmatter
    assert.strictEqual(targetContent.includes('applyTo:'), false, 'applyTo field should be stripped')
    assert.strictEqual(targetContent.includes('description:'), false, 'description field should be stripped')
    assert.strictEqual(targetContent.includes('source:'), false, 'source field should be stripped')
    assert.strictEqual(targetContent.startsWith('---'), false, 'Should not start with frontmatter')

    // Should contain the actual content
    assert.strictEqual(targetContent.includes('# Testing Guidelines'), true, 'Content should be preserved')
    assert.strictEqual(targetContent.includes('This is content after frontmatter.'), true, 'Content should be preserved')
    assert.strictEqual(targetContent.includes('## Section 1'), true, 'Content should be preserved')
  })

  it('should handle files without frontmatter correctly', async () => {
    // Create test template file without frontmatter
    const templateWithoutFrontmatter = `# Simple Template

This template has no frontmatter.

## Instructions

Follow these guidelines.`

    await fs.writeFile(path.join(testTemplateDir, 'no-frontmatter.md'), templateWithoutFrontmatter, 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify that content is preserved unchanged
    const targetFilePath = path.join(testTargetDir, 'no-frontmatter.md')
    const targetContent = await fs.readFile(targetFilePath, 'utf-8')

    assert.strictEqual(targetContent, templateWithoutFrontmatter, 'Content should be unchanged when no frontmatter')
  })

  it('should create GEMINI.md with imports for new topics', async () => {
    // Create test template files
    await fs.writeFile(path.join(testTemplateDir, 'test1.md'), '# Test 1', 'utf-8')
    await fs.writeFile(path.join(testTemplateDir, 'test2.md'), '# Test 2', 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify GEMINI.md was created with imports
    const geminiFilePath = path.join(testProjectRoot, 'GEMINI.md')
    const geminiFileExists = await fs.access(geminiFilePath).then(() => true).catch(() => false)
    assert.strictEqual(geminiFileExists, true)

    const geminiContent = await fs.readFile(geminiFilePath, 'utf-8')
    assert.strictEqual(geminiContent.includes('# Testing'), true, 'Should have Testing category header')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/test1.md'), true, 'Should have import for test1.md')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/test2.md'), true, 'Should have import for test2.md')

    // Verify using @ syntax (not bullet points like Claude)
    assert.strictEqual(geminiContent.includes('- @'), false, 'Should not use bullet points for imports')
  })

  it('should append imports to existing GEMINI.md file', async () => {
    // Create existing GEMINI.md file
    const existingContent = `# Existing Content

This is existing content in GEMINI.md.

# Security

@./.gemini/rules/security-rule.md`

    await fs.writeFile(path.join(testProjectRoot, 'GEMINI.md'), existingContent, 'utf-8')

    // Create test template files
    await fs.writeFile(path.join(testTemplateDir, 'new-test.md'), '# New Test', 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify GEMINI.md was updated without losing existing content
    const geminiFilePath = path.join(testProjectRoot, 'GEMINI.md')
    const geminiContent = await fs.readFile(geminiFilePath, 'utf-8')

    assert.strictEqual(geminiContent.includes('# Existing Content'), true, 'Should preserve existing content')
    assert.strictEqual(geminiContent.includes('This is existing content'), true, 'Should preserve existing content')
    assert.strictEqual(geminiContent.includes('# Security'), true, 'Should preserve existing sections')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/security-rule.md'), true, 'Should preserve existing imports')
    assert.strictEqual(geminiContent.includes('# Testing'), true, 'Should add new Testing section')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/new-test.md'), true, 'Should add new import')
  })

  it('should not duplicate imports if they already exist', async () => {
    // Create existing GEMINI.md file with existing testing imports
    const existingContent = `# Testing

@./.gemini/rules/existing-test.md`

    await fs.writeFile(path.join(testProjectRoot, 'GEMINI.md'), existingContent, 'utf-8')

    // Create test template files
    await fs.writeFile(path.join(testTemplateDir, 'existing-test.md'), '# Existing Test', 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify GEMINI.md was not modified since imports already exist
    const geminiFilePath = path.join(testProjectRoot, 'GEMINI.md')
    const geminiContent = await fs.readFile(geminiFilePath, 'utf-8')

    // Count occurrences of the import to ensure no duplicates
    const importCount = (geminiContent.match(/@\.\/\.gemini\/rules\/existing-test\.md/g) || []).length
    assert.strictEqual(importCount, 1, 'Should not duplicate existing imports')
  })

  it('should handle multiple template files for same topic', async () => {
    // Create multiple test template files
    await fs.writeFile(path.join(testTemplateDir, 'rule1.md'), '# Rule 1', 'utf-8')
    await fs.writeFile(path.join(testTemplateDir, 'rule2.md'), '# Rule 2', 'utf-8')
    await fs.writeFile(path.join(testTemplateDir, 'rule3.md'), '# Rule 3', 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'secure-code'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify all files were copied
    const targetFiles = await fs.readdir(testTargetDir)
    assert.strictEqual(targetFiles.length, 3, 'Should copy all template files')
    assert.ok(targetFiles.includes('rule1.md'), 'Should include rule1.md')
    assert.ok(targetFiles.includes('rule2.md'), 'Should include rule2.md')
    assert.ok(targetFiles.includes('rule3.md'), 'Should include rule3.md')

    // Verify GEMINI.md has all imports
    const geminiFilePath = path.join(testProjectRoot, 'GEMINI.md')
    const geminiContent = await fs.readFile(geminiFilePath, 'utf-8')
    assert.strictEqual(geminiContent.includes('# Secure Coding'), true, 'Should have correct category header')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/rule1.md'), true, 'Should import rule1.md')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/rule2.md'), true, 'Should import rule2.md')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/rule3.md'), true, 'Should import rule3.md')
  })

  it('should map topic values to correct labels', async () => {
    // Create test template file
    await fs.writeFile(path.join(testTemplateDir, 'test.md'), '# Test', 'utf-8')

    // Test different topic mappings
    const testCases = [
      { topic: 'secure-code', expectedLabel: 'Secure Coding' },
      { topic: 'security-vulnerabilities', expectedLabel: 'Security Vulnerabilities' },
      { topic: 'testing', expectedLabel: 'Testing' },
      { topic: 'custom-topic', expectedLabel: 'custom-topic' } // Fallback to original value
    ]

    for (const testCase of testCases) {
      // Clean GEMINI.md for each test
      const geminiFilePath = path.join(testProjectRoot, 'GEMINI.md')
      try {
        await fs.unlink(geminiFilePath)
      } catch {
        // File might not exist
      }

      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'gemini',
        codeLanguage: 'javascript',
        codeTopic: testCase.topic
      }

      await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

      const geminiContent = await fs.readFile(geminiFilePath, 'utf-8')
      assert.strictEqual(geminiContent.includes(`# ${testCase.expectedLabel}`), true,
        `Should map "${testCase.topic}" to "${testCase.expectedLabel}"`)
    }
  })

  it('should handle files with .instructions suffix correctly', async () => {
    // Create test template file with .instructions suffix
    await fs.writeFile(path.join(testTemplateDir, 'test.instructions.md'), '# Test Instructions', 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify the target file is named correctly (without .instructions)
    const targetFiles = await fs.readdir(testTargetDir)
    assert.ok(targetFiles.includes('test.md'), 'Should create test.md (without .instructions)')
    assert.ok(!targetFiles.includes('test.instructions.md'), 'Should not keep .instructions in filename')

    // Verify GEMINI.md import uses correct filename
    const geminiFilePath = path.join(testProjectRoot, 'GEMINI.md')
    const geminiContent = await fs.readFile(geminiFilePath, 'utf-8')
    assert.strictEqual(geminiContent.includes('@./.gemini/rules/test.md'), true, 'Should import with correct filename')
  })

  it('should skip non-markdown files', async () => {
    // Create mixed file types
    await fs.writeFile(path.join(testTemplateDir, 'test.md'), '# Test', 'utf-8')
    await fs.writeFile(path.join(testTemplateDir, 'test.txt'), 'Text file', 'utf-8')
    await fs.writeFile(path.join(testTemplateDir, 'test.json'), '{}', 'utf-8')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify only markdown files were copied
    const targetFiles = await fs.readdir(testTargetDir)
    assert.strictEqual(targetFiles.length, 1, 'Should only copy markdown files')
    assert.ok(targetFiles.includes('test.md'), 'Should include markdown file')
    assert.ok(!targetFiles.includes('test.txt'), 'Should not include text file')
    assert.ok(!targetFiles.includes('test.json'), 'Should not include JSON file')
  })

  it('should handle errors gracefully when template files cannot be read', async () => {
    // Create a template file with restricted permissions (if possible on this system)
    const restrictedFile = path.join(testTemplateDir, 'restricted.md')
    await fs.writeFile(restrictedFile, '# Restricted', 'utf-8')

    // Try to make it unreadable (this might not work on all systems)
    try {
      await fs.chmod(restrictedFile, 0o000)
    } catch {
      // If chmod fails, skip this test
      return
    }

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'gemini',
      codeLanguage: 'javascript',
      codeTopic: 'testing'
    }

    // This should not throw an error, but handle it gracefully
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify the process completed without crashing
    const targetFiles = await fs.readdir(testTargetDir)
    // The file should not be in the target directory due to read error
    assert.ok(!targetFiles.includes('restricted.md'), 'Should not copy unreadable file')

    // Restore permissions for cleanup
    try {
      await fs.chmod(restrictedFile, 0o644)
    } catch {
      // Ignore cleanup errors
    }
  })
})
