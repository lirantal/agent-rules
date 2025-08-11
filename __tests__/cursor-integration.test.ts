import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { scaffoldAiAppInstructions } from '../src/main.js'

describe('Cursor Integration Tests', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    originalCwd = process.cwd()
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'cursor-integration-test-'))

    // Change to temp directory for testing
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('should successfully scaffold Cursor instructions', async () => {
    const scaffoldInstructions = {
      aiApp: 'cursor',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Execute the scaffolding (this will use the actual project templates)
    await scaffoldAiAppInstructions(scaffoldInstructions)

    // Verify the target directory was created
    const targetDir = path.join(tempDir, '.cursor', 'rules')
    const targetStat = await fs.stat(targetDir)
    assert.ok(targetStat.isDirectory())

    // Verify the files were created with correct names and extensions
    const targetFiles = await fs.readdir(targetDir)

    // Should have the actual template files from the project
    assert.ok(targetFiles.length > 0)
    assert.ok(targetFiles.every(file => file.endsWith('.mdc')))

    // Check for specific files that should exist
    assert.ok(targetFiles.includes('child-process.mdc'))
    assert.ok(targetFiles.includes('file-system.mdc'))

    // Verify content is preserved for one of the files
    const childProcessContent = await fs.readFile(path.join(targetDir, 'child-process.mdc'), 'utf-8')
    assert.ok(childProcessContent.includes('System processes secure coding guidelines'))
  })

  it('should handle directory creation when parent doesn\'t exist', async () => {
    const scaffoldInstructions = {
      aiApp: 'cursor',
      codeLanguage: 'nodejs',
      codeTopic: 'secure-code'
    }

    // Ensure the .cursor directory doesn't exist initially
    const cursorDir = path.join(tempDir, '.cursor')
    try {
      await fs.access(cursorDir)
      assert.fail('Directory should not exist initially')
    } catch {
      // Expected - directory doesn't exist
    }

    await scaffoldAiAppInstructions(scaffoldInstructions)

    // Verify both .cursor and .cursor/rules directories were created
    const targetDir = path.join(tempDir, '.cursor', 'rules')
    const targetStat = await fs.stat(targetDir)
    assert.ok(targetStat.isDirectory())

    const targetFiles = await fs.readdir(targetDir)
    assert.ok(targetFiles.length > 0)
  })
})
