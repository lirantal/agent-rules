# Adapter Development Guide

This guide provides detailed instructions for creating new AI app adapters for the `agent-rules` project.

## Overview

The `agent-rules` project uses an adapter pattern to support multiple AI coding assistants. Each AI app has unique requirements for how instruction files should be processed, named, and organized. The adapter system provides a clean way to handle these differences while maintaining a consistent core API.

## Architecture

### Base Components

- **`BaseAdapter`**: Abstract base class that all adapters must extend
- **`AdapterRegistry`**: Singleton registry that manages adapter instances
- **`AiAppConfig`**: Interface defining adapter configuration
- **`ScaffoldInstructions`**: Interface for user input parameters

### Current Adapters

- **`GitHubCopilotAdapter`**: Handles GitHub Copilot instruction generation with direct file copying
- **`CursorAdapter`**: Handles Cursor instruction generation with frontmatter transformation
- **`ClaudeCodeAdapter`**: Handles Claude Code instruction generation with main context file management and @ imports

### Dependencies for Frontmatter Processing

If your adapter needs to process markdown frontmatter, the following dependencies are available:

```typescript
// For AST-based markdown parsing
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter'

// For structured YAML processing
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
```

## Creating a New Adapter

### Step 1: Create the Adapter Class

Create a new file in `src/adapters/` following the naming convention `{ai-app-name}-adapter.ts`:

```typescript
import from 'node:path'
import fs from 'node:fs/promises'
import { debuglog } from 'node:util'
import { BaseAdapter, type AiAppConfig, type ScaffoldInstructions } from './base-adapter.js'

const debug = debuglog('agent-rules')

/**
 * Adapter for [AI App Name] instruction processing
 */
export class YourAiAppAdapter extends BaseAdapter {
  constructor () {
    const config: AiAppConfig = {
      directory: 'path/to/target/directory',    // Where files should be generated
      filesSuffix: '.your-extension'            // File extension for generated files
    }
    super(config)
  }

  /**
   * Process instructions according to [AI App Name] requirements
   */
  async processInstructions (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    // Implement your AI app-specific logic here
    // This could be:
    // - Direct file copying (like GitHub Copilot)
    // - Template transformation
    // - File merging
    // - Custom processing
    
    await this.yourProcessingMethod(resolvedTemplateDirectory, resolvedTargetDirectory)
  }

  // Add private methods for your specific processing logic
  private async yourProcessingMethod (
    templateDir: string,
    targetDir: string
  ): Promise<void> {
    // Implementation details
  }
}
```

### Step 2: Register the Adapter

Add your adapter to the registry in `src/adapters/adapter-registry.ts`:

```typescript
import { YourAiAppAdapter } from './your-ai-app-adapter.js'

export class AdapterRegistry {
  private static readonly adapters = new Map<string, () => BaseAdapter>([
    ['github-copilot', () => new GitHubCopilotAdapter()],
    ['your-ai-app', () => new YourAiAppAdapter()]  // Add this line
  ])
  // ... rest of the class
}
```

### Step 3: Update Exports

Add your adapter to `src/adapters/index.ts`:

```typescript
export { YourAiAppAdapter } from './your-ai-app-adapter.js'
```

### Step 4: Create Tests

Create comprehensive tests in `__tests__/` directory:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { YourAiAppAdapter } from '../src/adapters/your-ai-app-adapter.js'

describe('YourAiAppAdapter', () => {
  it('should have correct configuration', () => {
    const adapter = new YourAiAppAdapter()
    const config = adapter.getConfig()
    
    assert.strictEqual(config.directory, 'expected/directory')
    assert.strictEqual(config.filesSuffix, '.expected-extension')
  })

  it('should process instructions correctly', async () => {
    // Test your processInstructions method
  })

  // Add more tests for edge cases, error handling, etc.
})
```

## Adapter Design Patterns

### 1. Direct File Copy (GitHub Copilot Pattern)

Best for AI apps that need simple file copying with renaming:

```typescript
async processInstructions(...) {
  await this.copyTemplateFiles(resolvedTemplateDirectory, resolvedTargetDirectory, this.config.filesSuffix)
}
```

### 2. Template Transformation

For AI apps that need to modify template content:

```typescript
async processInstructions(...) {
  const templateFiles = await fs.readdir(resolvedTemplateDirectory)
  
  for (const templateFile of templateFiles) {
    const content = await fs.readFile(path.join(resolvedTemplateDirectory, templateFile), 'utf-8')
    const transformedContent = this.transformTemplate(content, scaffoldInstructions)
    await this.writeProcessedFile(transformedContent, templateFile, resolvedTargetDirectory)
  }
}
```

### 3. File Merging

For AI apps that combine multiple templates into single files:

```typescript
async processInstructions(...) {
  const mergedContent = await this.mergeTemplates(resolvedTemplateDirectory, scaffoldInstructions)
  await this.writeMergedFile(mergedContent, resolvedTargetDirectory)
}
```

### 4. Main Context File Management (Claude Code Pattern)

For AI apps that need main context files with @ imports:

```typescript
async processInstructions(...) {
  // Copy template files to target directory
  await this.copyTemplateFiles(resolvedTemplateDirectory, resolvedTargetDirectory, this.config.filesSuffix)
  
  // Update main context file with imports
  await this.updateMainContextFile(scaffoldInstructions, resolvedTemplateDirectory, resolvedTargetDirectory)
}

private async updateMainContextFile(...) {
  // Read existing main file or create new
  const mainFilePath = path.join(projectRoot, 'MAIN_FILE.md')
  let content = ''
  try {
    content = await fs.readFile(mainFilePath, 'utf-8')
  } catch {
    // File doesn't exist, will create new
  }
  
  // Generate imports
  const imports = templateFiles.map(file => `- @./target/directory/${file}`)
  
  // Add category and imports with duplicate detection
  const updatedContent = this.addImportsToContent(content, categoryLabel, imports)
  
  // Write back to main file
  await fs.writeFile(mainFilePath, updatedContent, 'utf-8')
}
```

### 5. Frontmatter Processing (Cursor Pattern)

For AI apps that need to transform template frontmatter metadata:

```typescript
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

async processInstructions(...) {
  const templateFiles = await fs.readdir(resolvedTemplateDirectory)
  
  for (const templateFile of templateFiles) {
    const content = await fs.readFile(path.join(resolvedTemplateDirectory, templateFile), 'utf-8')
    const processedContent = this.processFrontmatter(content)
    await this.writeProcessedFile(processedContent, templateFile, resolvedTargetDirectory)
  }
}

private processFrontmatter(content: string): string {
  try {
    // Parse markdown with frontmatter support
    const ast = fromMarkdown(content, {
      extensions: [frontmatter(['yaml'])],
      mdastExtensions: [frontmatterFromMarkdown(['yaml'])]
    })

    // Transform frontmatter nodes
    let hasTransformations = false
    for (const node of ast.children) {
      if (node.type === 'yaml') {
        const transformedValue = this.transformFrontmatterFields(node.value)
        if (transformedValue !== node.value) {
          node.value = transformedValue
          hasTransformations = true
        }
      }
    }

    // Convert back to markdown if transformations were made
    if (hasTransformations) {
      return toMarkdown(ast, {
        extensions: [frontmatterToMarkdown(['yaml'])]
      })
    }

    return content
  } catch (error) {
    // Fallback to original content on error
    return content
  }
}

private transformFrontmatterFields(frontmatterValue: string): string {
  try {
    // Use structured YAML parsing for accurate transformation
    const frontmatterData = parseYaml(frontmatterValue)
    
    if (frontmatterData && typeof frontmatterData === 'object' && 'applyTo' in frontmatterData) {
      const transformedData = { ...frontmatterData }
      transformedData.globs = frontmatterData.applyTo  // Transform field
      delete transformedData.applyTo
      
      return stringifyYaml(transformedData, { lineWidth: -1 }).trim()
    }
    
    return frontmatterValue
  } catch (error) {
    // Fallback to regex-based transformation for malformed YAML
    return frontmatterValue.replace(/^applyTo:\s*(.+)$/gm, 'globs: $1')
  }
}
```

## Best Practices

### Security
- Always validate file paths using the 5-step secure path construction
- Never trust user input for file operations
- Use `path.basename()` to sanitize filenames
- Implement proper error handling for file system operations

### Frontmatter Processing
- Use AST-based parsing with micromark extensions for reliable markdown processing
- Employ structured YAML parsing with the `yaml` package for object manipulation
- Always provide fallback mechanisms for malformed YAML (e.g., regex-based transformation)
- Preserve non-transformed frontmatter fields exactly as they appear in the source
- Use `stringifyYaml` options to control output formatting (`lineWidth: -1` prevents line wrapping)
- Handle edge cases like empty frontmatter, missing fields, and invalid YAML gracefully

### Error Handling
- Provide descriptive error messages
- Handle file permission errors gracefully
- Log debug information for troubleshooting
- Fail fast on configuration errors
- Always return original content when frontmatter processing fails

### Performance
- Minimize file system operations
- Use efficient file reading/writing patterns
- Implement proper resource cleanup
- Consider memory usage for large templates

### Testing
- Test all public methods
- Include edge cases and error scenarios
- Mock file system operations where appropriate
- Verify security validations work correctly

## Common Pitfalls

1. **Missing Error Handling**: File operations can fail, handle errors appropriately
2. **Configuration Inconsistencies**: Ensure your config matches your actual file operations
3. **Memory Leaks**: Properly close file handles and clean up resources
4. **Platform Compatibility**: Use `path` module methods instead of string concatenation
5. **Frontmatter Processing Errors**: Always provide fallback mechanisms for YAML parsing failures
6. **AST Manipulation**: Be careful when modifying markdown AST nodes to maintain document structure
7. **🚨 CRITICAL: Manual Testing in Project Directory**: **NEVER** run manual CLI tests from the project root directory

## ⚠️ CRITICAL WARNING: Manual Testing

**NEVER manually test your adapter by running the CLI from the project root directory!**

### ❌ WRONG - Do NOT do this:
```bash
# Being in the project directory
cd /path/to/agent-rules
npm run build
node dist/bin/cli.mjs --app your-adapter --topics testing  # ❌ This pollutes the project!
```

This will create scaffold files in the actual project directory (`.your-adapter/`, `YOUR_ADAPTER.md`, etc.), polluting the workspace.

### ✅ CORRECT - Always use temporary directories:
```bash
# Manual testing should ALWAYS be in temporary directories
cd /tmp
mkdir test-your-adapter
cd test-your-adapter
node /path/to/agent-rules/dist/bin/cli.mjs --app your-adapter --topics testing
# Verify output, then clean up
cd /tmp && rm -rf test-your-adapter
```

### Why This Matters:
- **Project Pollution**: Scaffolding in the project directory creates unwanted files
- **Git Contamination**: These files might accidentally get committed
- **Misleading State**: The project should remain clean for other developers
- **Integration Tests Exist**: Manual testing should be minimal - rely on comprehensive integration tests

### Proper Testing Workflow:
1. **Write Integration Tests First**: Add comprehensive integration tests in `__tests__/integration.test.ts`
2. **Run Automated Tests**: Use `npm test` to verify functionality
3. **Manual Testing (if needed)**: Only in `/tmp` or other temporary directories
4. **Never Test in Project Root**: The project directory should remain clean

### ⚠️ CLI Testing Requirements

**All CLI tests that execute the actual CLI command MUST use temporary directories as working directories!**

#### ❌ WRONG - CLI tests without proper working directory:
```typescript
test('should work with valid app', () => {
  const result = spawnSync('node', ['dist/bin/cli.mjs', '--app', 'gemini', '--topics', 'testing'], {
    encoding: 'utf8',
    timeout: 10000
    // ❌ Missing cwd - runs in project directory!
  })
})
```

#### ✅ CORRECT - CLI tests with temporary working directory:
```typescript
test('should work with valid app', () => {
  const cliPath = path.resolve(originalCwd, 'dist/bin/cli.mjs')
  const result = spawnSync('node', [cliPath, '--app', 'gemini', '--topics', 'testing'], {
    encoding: 'utf8',
    timeout: 10000,
    cwd: tempDir  // ✅ Runs in temporary directory
  })
})
```

**Key Requirements for CLI Tests:**
- Always use `cwd: tempDir` option in `spawnSync` calls
- Use absolute paths to the CLI: `path.resolve(originalCwd, 'dist/bin/cli.mjs')`
- Set up `tempDir` in `beforeEach` and clean up in `afterEach`

## Testing Your Adapter

**⚠️ IMPORTANT: All testing must be done through automated tests or in temporary directories - NEVER in the project root!**

Before submitting your adapter:

1. **Run the full test suite**: `npm test`
2. **Run linting**: `npm run lint`
3. **Manual testing (if absolutely necessary)**: Only in `/tmp` or other temporary directories
4. **Test error scenarios**: Through automated tests (missing files, permissions, etc.)
5. **Test frontmatter processing**: Through automated tests with various YAML formats and edge cases
6. **Add end-to-end integration tests**: Required for all new adapters

### End-to-End Integration Testing Requirements

**All new adapters MUST include comprehensive end-to-end integration tests** in `__tests__/integration.test.ts`. These tests should verify the complete workflow from `scaffoldAiAppInstructions()` through your adapter to final file output.

**Required Integration Test Cases:**

1. **Fresh Scaffolding Test**: Test complete workflow in empty directory
   ```typescript
   test('should successfully scaffold [YourAdapter] [topic] instructions', async () => {
     // Verify directory structure creation
     // Verify template files copied correctly  
     // Verify any special files created (e.g., main context files)
     // Verify content preservation from templates
   })
   ```

2. **Existing File Management Test**: Test handling of existing files/content
   ```typescript
   test('should append/merge with existing [YourAdapter] files without conflicts', async () => {
     // Create existing content first
     // Run scaffolding
     // Verify existing content preserved + new content added
   })
   ```

3. **Multiple Topic Test**: Test scaffolding multiple topics sequentially
   ```typescript
   test('should handle multiple topic scaffolding correctly', async () => {
     // Scaffold topic A, then topic B
     // Verify both topics handled correctly
     // Verify no conflicts between topics
   })
   ```

4. **Duplicate Prevention Test**: Test running same scaffolding twice
   ```typescript
   test('should not duplicate content when scaffolding same topic twice', async () => {
     // Run same scaffolding operation twice
     // Verify no duplicate content/imports/sections
   })
   ```

5. **Error Handling Test**: Test graceful error handling
   ```typescript
   test('should handle [YourAdapter] scaffolding errors gracefully', async () => {
     // Test with various error conditions
     // Verify no unhandled exceptions
     // Verify partial recovery when possible
   })
   ```

**Why End-to-End Tests Are Required:**

- **Catch Integration Issues**: Unit tests mock file systems; integration tests use real files
- **Verify Complete Workflow**: Test the actual `scaffoldAiAppInstructions()` path users will take
- **Prevent Manual Testing**: Eliminate need for manual `/tmp` directory testing
- **Regression Protection**: Ensure future changes don't break existing functionality
- **Validate Real File Operations**: Confirm actual directory structures and file content

**Integration Test Pattern:**
```typescript
// In __tests__/integration.test.ts, add to 'End-to-End Scaffolding' describe block
test('should successfully scaffold [YourAdapter] [topic] instructions', async () => {
  // Arrange
  process.chdir(tempDir)
  const scaffoldInstructions = {
    aiApp: 'your-adapter',
    codeLanguage: 'nodejs', 
    codeTopic: 'secure-code'
  }

  // Act  
  await scaffoldAiAppInstructions(scaffoldInstructions)

  // Assert - Verify directory structure, files, content preservation
  const targetDir = path.join(tempDir, 'expected/directory')
  const files = await fs.readdir(targetDir)
  // ... comprehensive assertions
})
```

See existing Claude Code integration tests in `__tests__/integration.test.ts` as a reference implementation.

## Example: Complete Adapter Implementations

- **Simple Processing**: See `src/adapters/github-copilot-adapter.ts` for direct file copying
- **Advanced Processing**: See `src/adapters/cursor-adapter.ts` for frontmatter transformation with AST parsing
- **Main Context File Management**: See `src/adapters/claude-code-adapter.ts` for main context file management with @ imports

All provide complete, production-ready adapter implementations that demonstrate the concepts covered in this guide.
