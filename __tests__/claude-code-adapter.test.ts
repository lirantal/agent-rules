import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ClaudeCodeAdapter } from '../src/adapters/claude-code-adapter.js'
import type { ScaffoldInstructions } from '../src/adapters/base-adapter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('ClaudeCodeAdapter', () => {
  let adapter: ClaudeCodeAdapter
  let tempDir: string
  let testProjectRoot: string
  let testTargetDir: string
  let testTemplateDir: string

  beforeEach(async () => {
    adapter = new ClaudeCodeAdapter()

    // Create temporary directory structure for testing
    tempDir = await fs.mkdtemp(path.join(__dirname, 'temp-claude-test-'))
    testProjectRoot = tempDir
    testTargetDir = path.join(tempDir, '.claude', 'rules')
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

    assert.strictEqual(config.directory, '.claude/rules')
    assert.strictEqual(config.filesSuffix, '.md')
  })

  it('should copy template files to target directory', async () => {
    // Create test template files
    const templateFile1 = 'file-system.md'
    const templateFile2 = 'child-process.md'
    const templateContent1 = '# File System Security\n\nSome content...'
    const templateContent2 = '# Child Process Security\n\nSome content...'

    await fs.writeFile(path.join(testTemplateDir, templateFile1), templateContent1)
    await fs.writeFile(path.join(testTemplateDir, templateFile2), templateContent2)

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify files were copied
    const copiedFiles = await fs.readdir(testTargetDir)
    assert.strictEqual(copiedFiles.length, 2)
    assert.ok(copiedFiles.includes('file-system.md'))
    assert.ok(copiedFiles.includes('child-process.md'))

    // Verify content was copied correctly
    const copiedContent1 = await fs.readFile(path.join(testTargetDir, 'file-system.md'), 'utf-8')
    const copiedContent2 = await fs.readFile(path.join(testTargetDir, 'child-process.md'), 'utf-8')
    assert.strictEqual(copiedContent1, templateContent1)
    assert.strictEqual(copiedContent2, templateContent2)
  })

  it('should create CLAUDE.md with imports for new topics', async () => {
    // Create test template files
    const templateFile = 'file-system.md'
    const templateContent = '# File System Security\n\nSome content...'
    await fs.writeFile(path.join(testTemplateDir, templateFile), templateContent)

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify CLAUDE.md was created
    const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
    const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')

    assert.ok(claudeContent.includes('# Secure Coding'))
    assert.ok(claudeContent.includes('- @./.claude/rules/file-system.md'))
  })

  it('should append imports to existing CLAUDE.md file', async () => {
    // Create existing CLAUDE.md
    const existingContent = '# Existing Content\n\nSome existing content...\n'
    const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
    await fs.writeFile(claudeFilePath, existingContent)

    // Create test template file
    const templateFile = 'testing.md'
    const templateContent = '# Testing Guidelines\n\nSome content...'
    await fs.writeFile(path.join(testTemplateDir, templateFile), templateContent)

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'testing'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify CLAUDE.md was updated
    const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')

    assert.ok(claudeContent.includes('# Existing Content'))
    assert.ok(claudeContent.includes('Some existing content...'))
    assert.ok(claudeContent.includes('# Testing'))
    assert.ok(claudeContent.includes('- @./.claude/rules/testing.md'))
  })

  it('should not duplicate imports if they already exist', async () => {
    // Create existing CLAUDE.md with imports
    const existingContent = `# Existing Content

Some existing content...

# Secure Coding

- @./.claude/rules/file-system.md
`
    const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
    await fs.writeFile(claudeFilePath, existingContent)

    // Create test template file
    const templateFile = 'file-system.md'
    const templateContent = '# File System Security\n\nSome content...'
    await fs.writeFile(path.join(testTemplateDir, templateFile), templateContent)

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify CLAUDE.md was not duplicated
    const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')
    const importCount = (claudeContent.match(/- @\.\/.claude\/rules\/file-system\.md/g) || []).length

    assert.strictEqual(importCount, 1, 'Import should not be duplicated')
  })

  it('should handle multiple template files for same topic', async () => {
    // Create multiple test template files
    const templateFiles = ['file-system.md', 'child-process.md']
    for (const file of templateFiles) {
      await fs.writeFile(path.join(testTemplateDir, file), `# ${file} Content`)
    }

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify CLAUDE.md contains all imports
    const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
    const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')

    assert.ok(claudeContent.includes('# Secure Coding'))
    assert.ok(claudeContent.includes('- @./.claude/rules/file-system.md'))
    assert.ok(claudeContent.includes('- @./.claude/rules/child-process.md'))
  })

  it('should map topic values to correct labels', async () => {
    // Test all topic mappings
    const topicMappings = [
      { topic: 'secure-code', label: 'Secure Coding' },
      { topic: 'security-vulnerabilities', label: 'Security Vulnerabilities' },
      { topic: 'testing', label: 'Testing' }
    ]

    for (const { topic, label } of topicMappings) {
      // Create test template file
      const templateFile = 'test.md'
      await fs.writeFile(path.join(testTemplateDir, templateFile), '# Test Content')

      const scaffoldInstructions: ScaffoldInstructions = {
        aiApp: 'claude-code',
        codeLanguage: 'nodejs',
        codeTopic: topic
      }

      // Process instructions
      await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

      // Verify correct label is used
      const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
      const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')
      assert.ok(claudeContent.includes(`# ${label}`))

      // Clean up for next iteration
      await fs.rm(claudeFilePath, { force: true })
      await fs.rm(path.join(testTargetDir, 'test.md'), { force: true })
    }
  })

  it('should handle files with .instructions suffix correctly', async () => {
    // Create template file with .instructions suffix
    const templateFile = 'file-system.instructions.md'
    const templateContent = '# File System Security\n\nSome content...'
    await fs.writeFile(path.join(testTemplateDir, templateFile), templateContent)

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify file was renamed correctly (removing .instructions)
    const copiedFiles = await fs.readdir(testTargetDir)
    assert.ok(copiedFiles.includes('file-system.md'))
    assert.ok(!copiedFiles.includes('file-system.instructions.md'))

    // Verify CLAUDE.md contains correct import path
    const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
    const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')
    assert.ok(claudeContent.includes('- @./.claude/rules/file-system.md'))
  })

  it('should skip non-markdown files', async () => {
    // Create mixed file types
    await fs.writeFile(path.join(testTemplateDir, 'valid.md'), '# Valid Content')
    await fs.writeFile(path.join(testTemplateDir, 'invalid.txt'), 'Invalid content')
    await fs.writeFile(path.join(testTemplateDir, 'another.json'), '{}')

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Process instructions
    await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)

    // Verify only markdown files were processed
    const copiedFiles = await fs.readdir(testTargetDir)
    assert.strictEqual(copiedFiles.length, 1)
    assert.ok(copiedFiles.includes('valid.md'))

    // Verify CLAUDE.md only contains markdown file imports
    const claudeFilePath = path.join(testProjectRoot, 'CLAUDE.md')
    const claudeContent = await fs.readFile(claudeFilePath, 'utf-8')
    assert.ok(claudeContent.includes('- @./.claude/rules/valid.md'))
    assert.ok(!claudeContent.includes('invalid.txt'))
    assert.ok(!claudeContent.includes('another.json'))
  })

  it('should handle errors gracefully when template files cannot be read', async () => {
    // Create a directory instead of a file to trigger an error
    await fs.mkdir(path.join(testTemplateDir, 'invalid-dir'))

    const scaffoldInstructions: ScaffoldInstructions = {
      aiApp: 'claude-code',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // This should not throw an error
    await assert.doesNotReject(async () => {
      await adapter.processInstructions(scaffoldInstructions, testTemplateDir, testTargetDir)
    })
  })
})
