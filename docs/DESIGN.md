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
| | GitHubCopilot  | |  Future AI     | |   ...   |  |
| |   Adapter      | |   Adapters     | |         |  |
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
  - Parses command-line arguments.
  - Prompts the user for input using `@clack/prompts`.
  - Calls the core logic to generate the agentic rules.
  - Handles errors and displays appropriate messages to the user.
- **Interfaces**: Interacts with the `main.ts` module.

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

#### 2.3.4. `AdapterRegistry`
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

## 3. Data Models

### 3.1. `ScaffoldInstructions`

- **Description**: Represents the user's selections for generating agentic rules.
- **Type Definition**:

```typescript
interface ScaffoldInstructions {
  aiApp: string;
  codeLanguage: string;
  codeTopic: string;
}
```

### 3.2. `AiAppConfig`

- **Description**: Represents the configuration for a supported AI app.
- **Type Definition**:

```typescript
interface AiAppConfig {
  directory: string;
  filesSuffix: string;
}
```

### 3.3. Adapter Pattern

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

## 4. APIs

### 4.1. Core Application API

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

### 4.2. Adapter Registry API

#### `AdapterRegistry.getAdapter(aiApp: string): BaseAdapter`

- **Description**: Factory method to retrieve an adapter instance for the specified AI app.
- **Parameters**:
  - `aiApp`: The AI app identifier (e.g., 'github-copilot')
- **Returns**: An instance of the appropriate adapter
- **Throws**: Error if the AI app is not supported

#### `AdapterRegistry.getSupportedAiApps(): string[]`

- **Description**: Returns a list of all supported AI app identifiers.
- **Returns**: Array of supported AI app strings

### 4.3. Adapter Interface

#### `BaseAdapter.processInstructions(scaffoldInstructions, resolvedTemplateDirectory, resolvedTargetDirectory): Promise<void>`

- **Description**: Abstract method that each adapter must implement for processing templates.
- **Parameters**:
  - `scaffoldInstructions`: User's selections
  - `resolvedTemplateDirectory`: Path to the template source
  - `resolvedTargetDirectory`: Path to the target destination
- **Returns**: Promise that resolves when processing is complete

## 5. Error Handling

- **User Cancellation**: The CLI should handle user cancellation gracefully by exiting the process without an error.
- **Invalid Input**: The CLI should validate user input and display an error message if the input is invalid.
- **File System Errors**: The application should handle file system errors, such as permission errors or missing files, by displaying an error message to the user.
- **Template Not Found**: The application should throw an error if the template directory cannot be found.

## 6. Testing Strategy

### 6.1. Unit Tests
- **Adapter Tests**: Each adapter class should have comprehensive unit tests covering:
  - Configuration validation
  - Template processing logic
  - Error handling
  - Secure path validation
- **Registry Tests**: The adapter registry should be tested for:
  - Correct adapter instantiation
  - Error handling for unsupported AI apps
  - Listing supported AI apps

### 6.2. Integration Tests
- **Core Logic Integration**: Test the interaction between `main.ts` and the adapter layer
- **Template Resolution**: Test template directory resolution and validation
- **End-to-End Workflows**: Test complete scaffolding workflows for each supported AI app

### 6.3. End-to-End Tests
- **CLI Integration**: Test the entire application from command line invocation
- **File System Operations**: Verify correct file creation and directory structure
- **Error Scenarios**: Test error handling for various failure modes

## 7. Implementation Considerations

### 7.1. Extensibility
- **Adapter Pattern**: The project uses the adapter pattern to make adding new AI apps straightforward
- **New AI App Support**: To add a new AI app:
  1. Create a new adapter class extending `BaseAdapter`
  2. Implement the `processInstructions` method with AI app-specific logic
  3. Register the adapter in `AdapterRegistry`
  4. Add corresponding tests

### 7.2. Maintainability
- **Clear Separation of Concerns**: Each adapter handles only its specific AI app logic
- **Frontmatter Processing Pipeline**: The frontmatter processing system is designed with clear separation:
  - AST parsing for reliable markdown structure handling
  - Structured YAML processing for accurate data manipulation
  - Fallback mechanisms for error resilience
  - Field transformation logic isolated in dedicated methods
- **OOP Design**: Class-based architecture makes code easier to understand and maintain
- **Type Safety**: Full TypeScript typing ensures compile-time error detection
- **Documentation**: Code is well-documented with clear responsibilities

### 7.3. Performance
- **Lazy Loading**: Adapters are instantiated only when needed
- **Efficient File Operations**: Minimized file system calls
- **AST Caching**: Markdown AST parsing is performed only when transformations are needed
- **Conditional Processing**: Frontmatter transformation is skipped when no changes are required
- **Memory Management**: Large files are processed streaming-style to minimize memory usage
- **Error Recovery**: Graceful handling of file operation failures

### 7.4. Development Guidelines

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
