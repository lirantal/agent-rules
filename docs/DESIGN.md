# Design Document

## 1. Architecture

The `agent-rules` project is a command-line interface (CLI) tool built with TypeScript and Node.js. The architecture is designed to be modular and extensible, with a clear separation of concerns between the user interface, core logic, and AI app-specific adapters.

### 1.1. Architectural Style

The project follows a layered architecture with an adapter pattern:

- **Presentation Layer**: The CLI, which is responsible for user interaction.
- **Application Layer**: The core logic, which orchestrates template resolution and delegates AI app-specific processing to adapters.
- **Adapter Layer**: AI app-specific adapters that handle the unique processing requirements for each supported AI assistant.
- **Data Layer**: The file system, which stores the templates for the agentic rules.

### 1.2. High-Level Diagram

```
+----------------------------------------------------+
|                   Presentation Layer               |
|                                                    |
| +------------------------------------------------+ |
| |                    CLI (bin/cli.ts)            | |
| +------------------------------------------------+ |
|                                                    |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|                   Application Layer                |
|                                                    |
| +------------------------------------------------+ |
| |      Core Logic (src/main.ts)                  | |
| +------------------------------------------------+ |
|                                                    |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|                    Adapter Layer                   |
|                                                    |
| +----------------+ +----------------+ +---------+  |
| | GitHubCopilot  | |   Cursor       | | Claude  |  |
| |   Adapter      | |   Adapter      | |  Code   |  |
| +----------------+ +----------------+ +---------+  |
|                                                    |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|                      Data Layer                    |
|                                                    |
| +------------------------------------------------+ |
| |      File System (__template__/*)              | |
| +------------------------------------------------+ |
|                                                    |
+----------------------------------------------------+
```

## 2. Components and Interfaces

### 2.1. `cli.ts`

- **Component**: The CLI entry point.
- **Responsibilities**: 
  - Parses command-line arguments using Node.js built-in `util.parseArgs`.
  - Supports both interactive and non-interactive modes of operation.
  - In interactive mode, prompts the user for input using `@clack/prompts`.
  - In non-interactive mode, processes command-line flags (`--app`, `--topics`, `--help`, `--version`).
  - Validates command-line arguments and provides helpful error messages.
  - Calls the core logic to generate the agentic rules.
  - Handles errors and displays appropriate messages to the user.
- **Interfaces**: Interacts with the `main.ts` module and the adapter registry for validation.

### 2.2. `main.ts`

- **Component**: The core orchestration logic of the application.
- **Responsibilities**:
  - Resolves the template directory based on the user's selections.
  - Creates the target directory for the generated files.
  - Delegates AI app-specific processing to the appropriate adapter.
- **Interfaces**: Exposes the `scaffoldAiAppInstructions` function to the `cli.ts` module and uses the adapter registry.

### 2.3. Adapter Layer (`src/adapters/`)

#### 2.3.1. `BaseAdapter` (Abstract Class)
- **Component**: Abstract base class for all AI app adapters.
- **Responsibilities**:
  - Defines the common interface for all adapters.
  - Provides configuration management.
  - Enforces the adapter contract through abstract methods.

#### 2.3.2. `GitHubCopilotAdapter`
- **Component**: Concrete adapter for GitHub Copilot.
- **Responsibilities**:
  - Implements GitHub Copilot-specific template processing.
  - Handles file copying with secure path validation.
  - Applies GitHub Copilot naming conventions and directory structure.

#### 2.3.3. `CursorAdapter`
- **Component**: Concrete adapter for Cursor AI coding assistant.
- **Responsibilities**:
  - Implements Cursor-specific template processing with frontmatter transformation.
  - Handles AST-based markdown parsing using micromark extensions.
  - Transforms frontmatter fields from template format (`applyTo`) to Cursor format (`globs`).
  - Uses structured YAML parsing for accurate field manipulation while preserving other frontmatter content.
  - Applies Cursor naming conventions (`.mdc` extension) and directory structure (`.cursor/rules`).

#### 2.3.4. `ClaudeCodeAdapter`
- **Component**: Concrete adapter for Claude Code AI coding assistant.
- **Responsibilities**:
  - Implements Claude Code-specific template processing with main context file management.
  - Copies template files to `.claude/rules` directory with secure path validation.
  - Manages `CLAUDE.md` main context file with @ imports organized by topic categories.
  - Implements duplicate detection and smart content appending for existing context files.
  - Maps internal topic identifiers to user-friendly category labels.
  - Applies Claude Code naming conventions (`.md` extension) and directory structure (`.claude/rules`).

#### 2.3.5. `AdapterRegistry`
- **Component**: Registry for managing adapter instances.
- **Responsibilities**:
  - Maps AI app identifiers to their corresponding adapters.
  - Provides factory methods for creating adapter instances.
  - Validates AI app support.

### 2.4. `__template__`

- **Component**: The directory containing the templates for the agentic rules.
- **Responsibilities**: 
  - Stores the templates in a structured way organized by programming language and topic.
  - Contains markdown files with YAML frontmatter for template metadata and processing instructions.
- **Interfaces**: Adapters read from this directory to process templates.

### 2.5. Template Frontmatter Processing

The project supports advanced frontmatter processing for template transformation, particularly for AI apps that require different metadata formats:

#### 2.5.1. Frontmatter Structure
Templates can include YAML frontmatter with metadata:
```markdown
---
applyTo: "**/*.js,**/*.ts"
description: "Template description"
version: "1.0.0"
---

# Template Content
...
```

#### 2.5.2. Processing Pipeline
1. **AST Parsing**: Uses `micromark-extension-frontmatter` and `mdast-util-frontmatter` for robust markdown parsing
2. **YAML Processing**: Employs structured YAML parsing with the `yaml` package for object manipulation
3. **Field Transformation**: Converts template-specific fields to AI app-specific formats
4. **Content Preservation**: Maintains all non-transformed frontmatter fields exactly as they are
5. **Fallback Handling**: Gracefully handles malformed YAML with regex-based fallback

#### 2.5.3. Cursor-Specific Transformations
- Transforms `applyTo` field to `globs` field for Cursor compatibility
- Preserves YAML structure and formatting using structured parsing
- Maintains proper markdown AST processing for reliable output

#### 2.5.4. Claude Code-Specific Processing
- Copies template files without frontmatter transformation (preserves original format)
- Generates main context file (`CLAUDE.md`) with @ imports for template inclusion
- Organizes imports by topic categories with user-friendly labels
- Implements duplicate detection to avoid redundant imports
- Uses simple string-based content management for efficient processing

## 3. CLI Architecture

### 3.1. Dual-Mode Operation

The CLI supports two distinct modes of operation:

#### 3.1.1. Interactive Mode (Default)
- Activated when no command-line flags are provided
- Uses `@clack/prompts` for user-friendly interactive selection
- Guides users through AI app and topic selection with descriptions
- Provides immediate validation and feedback
- Handles user cancellation gracefully

#### 3.1.2. Non-Interactive Mode
- Activated when command-line flags are provided
- Uses Node.js built-in `util.parseArgs` for argument parsing
- Supports the following flags:
  - `--app` or `-a`: Specify the AI app (required in non-interactive mode)
  - `--topics` or `-t`: Specify one or more topics (multiple values supported)
  - `--help` or `-h`: Display help information and exit
  - `--version` or `-v`: Display version information and exit
- Validates arguments against available options from the adapter registry and template system
- Provides clear error messages with available options listed

### 3.2. Command Line Argument Processing

#### 3.2.1. Argument Parsing
```typescript
interface CliArgs {
  app?: string
  topics?: string[]
  help?: boolean
  version?: boolean
}
```

#### 3.2.2. Validation Logic
- **App Validation**: Checks against `AdapterRegistry.getSupportedAiApps()`
- **Topic Validation**: Checks against available template directories
- **Completeness Validation**: Ensures both `--app` and `--topics` are provided when using non-interactive mode
- **Error Handling**: Provides specific error messages for different validation failures

#### 3.2.3. Help and Version Information
- **Help**: Displays usage information, available options, and examples
- **Version**: Reads version from `package.json` using secure path resolution

### 3.3. Mode Selection Logic

The CLI determines the operation mode using the following logic:
1. Parse command-line arguments using `util.parseArgs`
2. If `--help` or `--version` flags are present, handle them and exit
3. If `--app` or `--topics` flags are present, validate and use non-interactive mode
4. Otherwise, fall back to interactive mode

## 4. Data Models

### 4.1. `ScaffoldInstructions`

- **Description**: Represents the user's selections for generating agentic rules.
- **Type Definition**:

```typescript
interface ScaffoldInstructions {
  aiApp: string;
  codeLanguage: string;
  codeTopic: string;
}
```

### 4.2. `AiAppConfig`

- **Description**: Represents the configuration for a supported AI app.
- **Type Definition**:

```typescript
interface AiAppConfig {
  directory: string;
  filesSuffix: string;
}
```

### 4.3. `CliArgs`

- **Description**: Represents the parsed command-line arguments.
- **Type Definition**:

```typescript
interface CliArgs {
  app?: string;
  topics?: string[];
  help?: boolean;
  version?: boolean;
}
```

### 4.4. Adapter Pattern

- **Description**: The adapter pattern implementation allows for extensible AI app support.
- **Key Classes**:

```typescript
abstract class BaseAdapter {
  protected readonly config: AiAppConfig;
  
  constructor(config: AiAppConfig);
  getConfig(): AiAppConfig;
  abstract processInstructions(
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void>;
}
```

## 5. Supported AI Apps

The project currently supports three AI coding assistants, each with unique characteristics and processing requirements:

### 5.1. GitHub Copilot
- **Identifier**: `github-copilot`
- **Directory**: `.github/instructions`
- **File Extension**: `.instructions.md`
- **Processing Strategy**: Direct file copying with secure path validation
- **Use Case**: Simple instruction files for GitHub Copilot workspace integration

### 5.2. Cursor
- **Identifier**: `cursor`
- **Directory**: `.cursor/rules`
- **File Extension**: `.mdc`
- **Processing Strategy**: Advanced frontmatter transformation with AST parsing
- **Special Features**: 
  - Transforms `applyTo` field to `globs` field in YAML frontmatter
  - Preserves non-transformed frontmatter content
  - Uses structured YAML processing for accuracy
- **Use Case**: Rule files for Cursor AI coding assistant with metadata transformation

### 5.3. Claude Code
- **Identifier**: `claude-code`
- **Directory**: `.claude/rules`
- **File Extension**: `.md`
- **Processing Strategy**: Main context file management with @ imports
- **Special Features**:
  - Creates/updates main `CLAUDE.md` context file at project root
  - Organizes imports by topic categories with user-friendly labels
  - Implements duplicate detection to avoid redundant imports
  - Uses @ syntax for file imports (e.g., `@./.claude/rules/filename.md`)
- **Use Case**: Rule files for Claude Code with automatic context file management

## 6. APIs

### 6.1. Core Application API

#### `scaffoldAiAppInstructions(scaffoldInstructions: ScaffoldInstructions): Promise<void>`

- **Description**: The main function that orchestrates the generation of agentic rules using the adapter pattern.
- **Parameters**:
  - `scaffoldInstructions`: An object containing the user's selections.
- **Returns**: A promise that resolves when the operation is complete.
- **Throws**: An error if the operation fails.
- **Process**:
  1. Validates input parameters
  2. Retrieves the appropriate adapter from the registry
  3. Resolves template and target directories
  4. Delegates processing to the adapter

### 6.2. CLI API

#### Command Line Interface Functions

##### `parseCommandLineArgs(): CliArgs`
- **Description**: Parses command-line arguments using Node.js `util.parseArgs`
- **Returns**: Parsed CLI arguments object
- **Throws**: Error for invalid arguments with helpful error messages

##### `validateCliArgs(args: CliArgs): void`
- **Description**: Validates parsed CLI arguments against available options
- **Parameters**: `args` - Parsed CLI arguments
- **Throws**: Error for invalid app, topics, or missing required arguments

##### `showHelp(): void`
- **Description**: Displays comprehensive help information including usage, options, and examples

##### `showVersion(): Promise<void>`
- **Description**: Displays version information read from package.json

### 6.3. Adapter Registry API

#### `AdapterRegistry.getAdapter(aiApp: string): BaseAdapter`

- **Description**: Factory method to retrieve an adapter instance for the specified AI app.
- **Parameters**:
  - `aiApp`: The AI app identifier (e.g., 'github-copilot')
- **Returns**: An instance of the appropriate adapter
- **Throws**: Error if the AI app is not supported

#### `AdapterRegistry.getSupportedAiApps(): string[]`

- **Description**: Returns a list of all supported AI app identifiers.
- **Returns**: Array of supported AI app strings

### 6.4. Adapter Interface

#### `BaseAdapter.processInstructions(scaffoldInstructions, resolvedTemplateDirectory, resolvedTargetDirectory): Promise<void>`

- **Description**: Abstract method that each adapter must implement for processing templates.
- **Parameters**:
  - `scaffoldInstructions`: User's selections
  - `resolvedTemplateDirectory`: Path to the template source
  - `resolvedTargetDirectory`: Path to the target destination
- **Returns**: Promise that resolves when processing is complete

## 7. Error Handling

## 7. Error Handling

- **User Cancellation**: The CLI should handle user cancellation gracefully by exiting the process without an error.
- **Invalid Input**: The CLI should validate user input and display an error message if the input is invalid.
- **Command Line Arguments**: The CLI should validate command-line arguments and provide helpful error messages with available options listed.
- **File System Errors**: The application should handle file system errors, such as permission errors or missing files, by displaying an error message to the user.
- **Template Not Found**: The application should throw an error if the template directory cannot be found.
- **Argument Parsing Errors**: The CLI should handle `util.parseArgs` errors gracefully and display help information.

## 8. Testing Strategy

### 8.1. Unit Tests
- **Adapter Tests**: Each adapter class should have comprehensive unit tests covering:
  - Configuration validation
  - Template processing logic
  - Error handling
  - Secure path validation
- **Registry Tests**: The adapter registry should be tested for:
  - Correct adapter instantiation
  - Error handling for unsupported AI apps
  - Listing supported AI apps
- **CLI Argument Tests**: The CLI argument parsing should be tested for:
  - Valid argument combinations
  - Invalid argument handling
  - Help and version flag functionality
  - Error message accuracy

### 8.2. Integration Tests
- **Core Logic Integration**: Test the interaction between `main.ts` and the adapter layer
- **Template Resolution**: Test template directory resolution and validation
- **End-to-End Workflows**: Test complete scaffolding workflows for each supported AI app
- **CLI Integration**: Test both interactive and non-interactive CLI modes

### 8.3. End-to-End Tests
- **CLI Integration**: Test the entire application from command line invocation
- **File System Operations**: Verify correct file creation and directory structure
- **Error Scenarios**: Test error handling for various failure modes
- **Command Line Scenarios**: Test all CLI flag combinations and error cases

## 9. Implementation Considerations

### 9.1. Extensibility
- **Adapter Pattern**: The project uses the adapter pattern to make adding new AI apps straightforward
- **CLI Architecture**: The dual-mode CLI design allows for both automation and user-friendly interaction
- **New AI App Support**: To add a new AI app:
  1. Create a new adapter class extending `BaseAdapter`
  2. Implement the `processInstructions` method with AI app-specific logic
  3. Register the adapter in `AdapterRegistry`
  4. Add corresponding tests
  5. Update CLI validation lists automatically (adapters are discovered via registry)

### 9.2. Maintainability
- **Clear Separation of Concerns**: Each adapter handles only its specific AI app logic
- **Frontmatter Processing Pipeline**: The frontmatter processing system is designed with clear separation:
  - AST parsing for reliable markdown structure handling
  - Structured YAML processing for accurate data manipulation
  - Fallback mechanisms for error resilience
  - Field transformation logic isolated in dedicated methods
- **Main Context File Management**: The main context file system provides:
  - Smart content appending without overwriting existing content
  - Duplicate detection to prevent redundant imports
  - Topic-based categorization with user-friendly labels
  - Flexible @ import syntax for file references
- **OOP Design**: Class-based architecture makes code easier to understand and maintain
- **Type Safety**: Full TypeScript typing ensures compile-time error detection
- **Documentation**: Code is well-documented with clear responsibilities

### 9.3. Performance
- **Lazy Loading**: Adapters are instantiated only when needed
- **Efficient File Operations**: Minimized file system calls
- **AST Caching**: Markdown AST parsing is performed only when transformations are needed
- **Conditional Processing**: Frontmatter transformation is skipped when no changes are required
- **Main Context File Optimization**: Content updates use string-based processing for efficiency
- **Duplicate Detection**: Smart import checking prevents unnecessary file operations
- **Memory Management**: Large files are processed streaming-style to minimize memory usage
- **Error Recovery**: Graceful handling of file operation failures
- **CLI Argument Parsing**: Uses efficient built-in Node.js `util.parseArgs` for fast argument processing

### 9.4. Development Guidelines

#### Adding a New Adapter
1. **Create Adapter Class**: Extend `BaseAdapter` in `src/adapters/`
2. **Implement Interface**: Define `processInstructions` method
3. **Register Adapter**: Add to `AdapterRegistry.adapters` map
4. **Add Tests**: Create comprehensive test suite
5. **Update Documentation**: Document the new AI app support

#### Security Requirements
- All file operations must follow the secure path construction guidelines
- Never trust user input for file paths without validation
- Implement proper error handling for file system operations
