# Architecture Overview

*This document provides a condensed architectural overview of the agent-rules project. For detailed implementation guidance, see the other docs/ files.*

## Project Purpose

CLI tool for generating agentic rules and instructions for AI coding assistants. Scaffolds security-focused instruction files tailored to specific AI apps, programming languages, and topics.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Layer     │    │  Core Logic     │    │  Adapter Layer  │
│   (bin/cli.ts)  │───▶│   (main.ts)     │───▶│   (adapters/)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                               ┌─────────────────┐
                                               │ Template System │
                                               │ (__template__/) │
                                               └─────────────────┘
```

## Core Components

### 1. CLI Layer (`src/bin/cli.ts`)
- **Dual Mode**: Interactive prompts (`@clack/prompts`) OR command-line flags
- **Arguments**: `--app`, `--topics`, `--help`, `--version`
- **Validation**: Against adapter registry and available topics
- **Tech**: Node.js `util.parseArgs` for argument parsing

### 2. Core Logic (`src/main.ts`)
- **Orchestration**: Template resolution → Directory creation → Adapter delegation
- **Functions**: 
  - `scaffoldAiAppInstructions()`: Main entry point
  - `resolveTemplateDirectory()`: Finds templates based on language/topic
  - `getAiAppDirectory()`: Gets adapter configuration

### 3. Adapter System (`src/adapters/`)
- **Pattern**: Adapter pattern for AI app-specific processing
- **Base**: `BaseAdapter` abstract class with `processInstructions()` method
- **Registry**: `AdapterRegistry` singleton managing adapter instances
- **Current Adapters**:
  - `GitHubCopilotAdapter`: Direct file copying
  - `CursorAdapter`: Frontmatter transformation (YAML processing)
  - `ClaudeCodeAdapter`: Main context file management with @ imports
  - `GeminiAdapter`: (check implementation)

### 4. Template System (`__template__/`)
- **Structure**: `__template__/{language}/{topic}/`
- **Format**: Markdown files with optional YAML frontmatter
- **Processing**: AI app-specific transformation (copy, modify, merge)

## Current Support Matrix

| Component | Options |
|-----------|---------|
| **AI Apps** | github-copilot, cursor, claude-code, gemini |
| **Languages** | nodejs |
| **Topics** | secure-code, security-vulnerabilities, testing |

## Key Design Patterns

### 1. Adapter Pattern
```typescript
abstract class BaseAdapter {
  abstract processInstructions(
    scaffoldInstructions: ScaffoldInstructions,
    templateDir: string,
    targetDir: string
  ): Promise<void>
}
```

### 2. Processing Strategies
- **Direct Copy**: GitHub Copilot pattern
- **Frontmatter Transform**: Cursor pattern (AST-based with micromark/mdast)
- **Main Context File**: Claude Code pattern (@ imports)
- **Custom Processing**: Extensible per adapter

### 3. Security-First
- 5-step secure path validation
- `path.basename()` sanitization
- Proper error handling for file operations

## Tech Stack

| Category | Technology |
|----------|------------|
| **Language** | TypeScript |
| **Runtime** | Node.js ≥22.0.0 |
| **Build** | tsup (dual ESM/CJS output) |
| **CLI** | @clack/prompts, util.parseArgs |
| **Markdown** | micromark, mdast-util-* |
| **YAML** | yaml package |
| **Testing** | Node.js test runner, c8 coverage |
| **Linting** | ESLint with neostandard + security plugin |

## File Structure

```
src/
├── main.ts              # Core orchestration
├── bin/cli.ts          # CLI entry point
└── adapters/           # AI app adapters
    ├── base-adapter.ts
    ├── *-adapter.ts
    ├── adapter-registry.ts
    └── index.ts

__template__/           # Template files
└── nodejs/
    ├── secure-code/
    ├── security-vulnerabilities/
    └── testing/

docs/                   # Documentation
├── ARCHITECTURE.md     # This file
├── PROJECT.md          # Detailed project overview
├── DESIGN.md           # Detailed design document
├── REQUIREMENTS.md     # Product requirements
└── ADAPTER_DEVELOPMENT.md  # Adapter development guide
```

## Extension Points

### Adding New AI Apps
1. Create `{app}-adapter.ts` extending `BaseAdapter`
2. Implement `processInstructions()` method
3. Register in `AdapterRegistry`
4. Add integration tests

### Adding New Topics/Languages
1. Create template directory: `__template__/{language}/{topic}/`
2. Add markdown files with optional frontmatter
3. Update CLI validation arrays

### Processing Strategies Reference
- **Simple Copy**: See `GitHubCopilotAdapter`
- **Frontmatter Processing**: See `CursorAdapter` (AST + YAML)
- **File Merging**: See `ClaudeCodeAdapter` (main context files)

## Development Workflow

```bash
npm start           # Run CLI in development
npm run build       # Build + copy templates
npm test            # Run test suite
npm run lint        # Lint codebase
```

## Critical Notes

- **Testing**: All new adapters require end-to-end integration tests
- **Security**: Always use secure path validation patterns
- **CLI Testing**: Must use temporary directories (`cwd: tempDir`)
- **Manual Testing**: Never test in project root - use `/tmp`
- **Frontmatter**: Provide fallback mechanisms for malformed YAML

---

*For detailed implementation guidance, adapter development patterns, and comprehensive examples, see the other documentation files in this directory.*
