# Commands Scaffolding Feature

## Overview

This document outlines the design and implementation of the commands scaffolding feature for the agent-rules CLI tool. This feature extends the existing template scaffolding system to manage custom commands/prompts for different AI applications.

## Requirements Analysis

### Core Requirements

1. **Template Source**: Command templates live in `__template__/{language}/_commands/*.command.md`
2. **Target Destinations**: Each AI app adapter defines its own commands location:
   - GitHub Copilot: `.github/prompts/` (with `.prompt.md` extension)
   - Other adapters: Not yet supported (returns null)
3. **File Transformation**: Adapters can transform command filenames to match their conventions
4. **User Choice**: CLI prompts users whether to include commands (optional step)
5. **Adapter Customization**: Each adapter specifies:
   - Target directory for command files
   - Optional filename transformation function

### Design Principles

- **Optional**: Users can opt-out of command scaffolding
- **Flexible**: Allow different target paths and file naming per AI app
- **Non-intrusive**: Silently skip if `_commands/` directory doesn't exist
- **Consistent**: Follow existing adapter pattern architecture (similar to MCP feature)

## Architecture Design

### 1. Enhanced Base Adapter Interface

```typescript
export interface CommandsConfig {
  /** Target directory for command files (relative to project root) */
  targetDirectory: string
  /** Function to transform command filename to target filename */
  fileNameTransform?: (filename: string) => string
}

export interface ScaffoldInstructions {
  aiApp: string
  codeLanguage: string
  codeTopic: string
  includeMcp?: boolean
  includeCommands?: boolean  // New optional field
}

export abstract class BaseAdapter {
  // ... existing methods

  /**
   * Get commands configuration for this AI app
   * Returns null if commands are not supported by this adapter
   */
  abstract getCommandsConfig(): CommandsConfig | null

  /**
   * Process commands configuration (optional override)
   * Default implementation handles copying command files with transformation
   */
  async processCommandsConfiguration(
    scaffoldInstructions: ScaffoldInstructions,
    resolvedCommandsTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    // Default implementation
  }
}
```

### 2. Commands Template Resolution

```typescript
// In main.ts
export async function resolveCommandsTemplateDirectory(
  scaffoldInstructions: ScaffoldInstructions
): Promise<string | null> {
  const { codeLanguage } = scaffoldInstructions
  const currentFileDirectory = resolvePackageRootDirectoryForTemplates()
  const commandsTemplateDirectory = path.join(
    currentFileDirectory, 
    templateRoot, 
    codeLanguage, 
    '_commands'
  )
  
  const resolvedCommandsTemplateDirectory = path.resolve(commandsTemplateDirectory)
  
  try {
    const templateStats = await fs.stat(resolvedCommandsTemplateDirectory)
    if (!templateStats.isDirectory()) {
      return null
    }
    return resolvedCommandsTemplateDirectory
  } catch (error) {
    // Silently return null if directory doesn't exist
    return null
  }
}
```

### 3. Enhanced Scaffolding Flow

```typescript
export async function scaffoldAiAppInstructions(
  scaffoldInstructions: ScaffoldInstructions
): Promise<void> {
  // ... existing instruction scaffolding logic
  
  // ... existing MCP scaffolding logic

  // Process commands configuration if requested and supported
  if (scaffoldInstructions.includeCommands) {
    const commandsConfig = adapter.getCommandsConfig()
    if (commandsConfig) {
      debug(`Processing commands configuration for ${aiApp}`)
      const resolvedCommandsTemplateDirectory = await resolveCommandsTemplateDirectory(
        scaffoldInstructions
      )
      if (resolvedCommandsTemplateDirectory) {
        await adapter.processCommandsConfiguration(
          scaffoldInstructions,
          resolvedCommandsTemplateDirectory,
          resolvedTargetDirectory
        )
      }
    }
  }
}
```

### 4. CLI Integration

```typescript
// Interactive mode prompt
const includeCommands = await select({
  message: 'Include custom commands?',
  options: [
    { value: true, label: 'Yes', hint: 'Add custom commands for this AI app' },
    { value: false, label: 'No', hint: 'Skip commands configuration' }
  ],
  initialValue: false
})

// Command line flag
--commands, -c    Include custom commands
```

## Implementation Details

### Base Adapter Default Implementation

The `BaseAdapter` class provides a default implementation of `processCommandsConfiguration()` that:

1. Reads all files from the commands template directory
2. Filters for files ending with `*.command.md`
3. Applies filename transformation if provided by the adapter
4. Copies files to the adapter-specified target directory
5. Handles errors gracefully with warnings

```typescript
async processCommandsConfiguration(
  scaffoldInstructions: ScaffoldInstructions,
  resolvedCommandsTemplateDirectory: string,
  resolvedTargetDirectory: string
): Promise<void> {
  const commandsConfig = this.getCommandsConfig()
  if (!commandsConfig) return

  const targetDirectory = path.resolve(process.cwd(), commandsConfig.targetDirectory)

  try {
    // Ensure target directory exists
    await fs.mkdir(targetDirectory, { recursive: true })

    // Read all files from commands template directory
    const files = await fs.readdir(resolvedCommandsTemplateDirectory)

    // Filter for *.command.md files
    const commandFiles = files.filter(file => file.endsWith('.command.md'))

    for (const commandFile of commandFiles) {
      const sourceFilePath = path.join(resolvedCommandsTemplateDirectory, commandFile)
      const stat = await fs.stat(sourceFilePath)

      if (stat.isFile()) {
        // Apply filename transformation if provided
        const targetFileName = commandsConfig.fileNameTransform
          ? commandsConfig.fileNameTransform(commandFile)
          : commandFile

        const targetFilePath = path.join(targetDirectory, targetFileName)

        // Read and copy file content
        const content = await fs.readFile(sourceFilePath, 'utf-8')
        await fs.writeFile(targetFilePath, content, 'utf-8')
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`Warning: Failed to process commands configuration: ${errorMessage}`)
  }
}
```

### GitHub Copilot Adapter Implementation

```typescript
export class GitHubCopilotAdapter extends BaseAdapter {
  getCommandsConfig(): CommandsConfig {
    return {
      targetDirectory: '.github/prompts',
      fileNameTransform: (filename: string) => 
        filename.replace('.command.md', '.prompt.md')
    }
  }
}
```

### Other Adapters

Currently, Cursor, Gemini, and Claude Code adapters return `null` from `getCommandsConfig()`:

```typescript
getCommandsConfig(): null {
  return null
}
```

## Template Structure

Commands are stored in `__template__/{language}/_commands/` with the naming convention `*.command.md`:

```
__template__/
  nodejs/
    _commands/
      github-issue-impl.command.md
    secure-code/
      ...
    testing/
      ...
```

### Command Template Format

Command templates use YAML frontmatter to define metadata:

```markdown
---
tools: ['fetch', 'githubRepo', 'get_pull_request']
agent: 'agent'
name: 'github-issue-impl'
description: 'Implement code based on a GitHub issue'
---

Your goal is to learn the requirements of a GitHub issue...
```

## CLI Usage

### Interactive Mode

```bash
npx agent-rules
```

The CLI will prompt:
1. Which AI App?
2. Which topics?
3. Include MCP configuration?
4. Include custom commands? ← New prompt

### Command Line Flags

```bash
# Include commands with GitHub Copilot
npx agent-rules --app github-copilot --topics secure-code --commands

# Short flag
npx agent-rules -a github-copilot -t testing -c

# Combine with MCP
npx agent-rules --app github-copilot --topics testing --mcp --commands
```

## Behavior by Adapter

| Adapter | Commands Support | Target Directory | File Transform |
|---------|-----------------|------------------|----------------|
| GitHub Copilot | ✅ | `.github/prompts/` | `.command.md` → `.prompt.md` |
| Cursor | ❌ (future) | N/A | N/A |
| Gemini | ❌ (future) | N/A | N/A |
| Claude Code | ❌ (future) | N/A | N/A |

## Error Handling

The feature handles several error scenarios gracefully:

1. **Missing `_commands/` directory**: Silently skipped (returns null)
2. **Unsupported adapter**: Commands not processed if `getCommandsConfig()` returns null
3. **File read/write errors**: Warnings logged, processing continues
4. **Invalid permissions**: Warnings logged, file skipped

## Testing

The feature includes:

1. **Unit tests**: Verify adapter configurations and file transformations
2. **Integration tests**: End-to-end scaffolding with commands enabled/disabled
3. **CLI tests**: Command line flags and interactive prompts

## Future Enhancements

Potential future improvements:

1. **Additional Adapter Support**: Implement commands for Cursor, Gemini, and Claude Code
2. **Custom Transformations**: Allow per-command content transformations
3. **Command Categories**: Support subdirectories within `_commands/`
4. **Command Validation**: Validate frontmatter format and required fields
5. **Command Updates**: Smart merging of existing vs new commands

## Migration Guide

For existing users, this is a non-breaking change:

- Commands are **optional** and disabled by default
- No changes to existing instruction or MCP scaffolding
- New `--commands` flag must be explicitly provided

## Related Documentation

- [MCP Feature Documentation](./FEATURE-MCP.md) - Similar scaffolding pattern
- [Adapter Development](./ADAPTER_DEVELOPMENT.md) - How to extend adapters
- [Design Overview](./DESIGN.md) - Overall architecture
