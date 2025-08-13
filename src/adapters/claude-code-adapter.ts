import path from 'node:path'
import fs from 'node:fs/promises'
import { debuglog } from 'node:util'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { BaseAdapter, type AiAppConfig, type ScaffoldInstructions } from './base-adapter.js'

const debug = debuglog('agent-rules')

/**
 * Claude Code adapter for processing instruction templates
 */
export class ClaudeCodeAdapter extends BaseAdapter {
  private static readonly CLAUDE_MAIN_FILE = 'CLAUDE.md'

  // Map topic values to their display labels from CLI
  private static readonly TOPIC_LABELS: Record<string, string> = {
    'secure-code': 'Secure Coding',
    'security-vulnerabilities': 'Security Vulnerabilities',
    testing: 'Testing'
  }

  constructor () {
    const config: AiAppConfig = {
      directory: '.claude/rules',
      filesSuffix: '.md'
    }
    super(config)
  }

  /**
   * Process instructions by copying template files and updating CLAUDE.md with imports
   */
  async processInstructions (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    // Copy template files to claude/rules directory
    await this.copyTemplateFiles(resolvedTemplateDirectory, resolvedTargetDirectory, this.config.filesSuffix)

    // Update CLAUDE.md with imports
    await this.updateClaudeMainFile(scaffoldInstructions, resolvedTemplateDirectory, resolvedTargetDirectory)
  }

  /**
   * Copy all template files from source to target directory
   */
  private async copyTemplateFiles (
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string,
    filesSuffix: string
  ): Promise<void> {
    const templateFiles = await fs.readdir(resolvedTemplateDirectory)

    for (const templateFile of templateFiles) {
      // Only process markdown files
      if (!templateFile.endsWith('.md')) {
        debug('Skipping non-markdown file:', templateFile)
        continue
      }

      const templateFilePath = path.join(resolvedTemplateDirectory, templateFile)
      await this.copyTemplateFile(templateFilePath, resolvedTargetDirectory, resolvedTargetDirectory, filesSuffix)
    }
  }

  /**
   * Copy a single template file to the target directory
   */
  private async copyTemplateFile (
    templateFilePath: string,
    targetFilePath: string,
    resolvedTargetDirectory: string,
    filesSuffix: string
  ): Promise<void> {
    // Base directory for path validation
    const baseDirectory = resolvedTargetDirectory

    // Decode and normalize the template file path
    const decodedPath = decodeURIComponent(templateFilePath)
    const normalizedPath = path.normalize(decodedPath)
    const sanitizedTemplateFile = path.basename(normalizedPath)
    const fullTemplatePath = path.join(path.dirname(templateFilePath), sanitizedTemplateFile)

    debug('Processing template file:', sanitizedTemplateFile)

    try {
      const stat = await fs.stat(fullTemplatePath)

      // Only process files, not directories
      if (stat.isFile()) {
        const targetFileName = this.generateTargetFileName(sanitizedTemplateFile, filesSuffix)
        const targetPath = path.join(targetFilePath, targetFileName)
        const resolvedTargetFilePath = this.validateTargetPath(targetPath, baseDirectory)

        debug('Writing template file to target path:', resolvedTargetFilePath)

        // Read and copy the template file content
        const templateContent = await fs.readFile(fullTemplatePath, 'utf-8')
        await fs.writeFile(resolvedTargetFilePath, templateContent, 'utf-8')
      }
    } catch (error) {
      console.warn(`Skipping file ${sanitizedTemplateFile}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate the target filename by applying the file suffix
   */
  private generateTargetFileName (templateFileName: string, filesSuffix: string): string {
    const parsedFile = path.parse(templateFileName)
    let baseName = parsedFile.name

    // If the template file already has the suffix in its name, remove it to avoid duplication
    if (baseName.endsWith('.instructions')) {
      baseName = baseName.replace(/\.instructions$/, '')
    }

    return `${baseName}${filesSuffix}`
  }

  /**
   * Update the main CLAUDE.md file with imports for the processed templates
   */
  private async updateClaudeMainFile (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    // Get the project root directory (parent of .claude/rules)
    const projectRoot = path.dirname(path.dirname(resolvedTargetDirectory))
    const claudeMainFilePath = path.join(projectRoot, ClaudeCodeAdapter.CLAUDE_MAIN_FILE)

    debug('Claude main file path:', claudeMainFilePath)

    // Read existing content or create new content
    let claudeContent = ''
    try {
      claudeContent = await fs.readFile(claudeMainFilePath, 'utf-8')
    } catch (error) {
      debug('CLAUDE.md not found, creating new file')
      claudeContent = ''
    }

    // Get the list of template files to generate imports
    const templateFiles = await fs.readdir(resolvedTemplateDirectory)
    const imports = templateFiles
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const targetFileName = this.generateTargetFileName(file, this.config.filesSuffix)
        return `- @./.claude/rules/${targetFileName}`
      })

    if (imports.length === 0) {
      debug('No template files to import')
      return
    }

    // Get the topic label for the category header
    const topicLabel = ClaudeCodeAdapter.TOPIC_LABELS[scaffoldInstructions.codeTopic] || scaffoldInstructions.codeTopic

    // Update the content with imports
    const updatedContent = this.addImportsToClaudeContent(claudeContent, topicLabel, imports)

    // Write the updated content back to CLAUDE.md
    await fs.writeFile(claudeMainFilePath, updatedContent, 'utf-8')
    debug('Updated CLAUDE.md with imports for topic:', topicLabel)
  }

  /**
   * Add imports to Claude content, avoiding duplicates and organizing by categories
   */
  private addImportsToClaudeContent (content: string, categoryLabel: string, imports: string[]): string {
    try {
      // Parse markdown content into AST
      fromMarkdown(content)

      // Check if the category section already exists and if imports are already present
      const existingContent = content.toLowerCase()
      const categoryHeaderLower = `# ${categoryLabel}`.toLowerCase()

      // Check if the category already exists
      const categoryExists = existingContent.includes(categoryHeaderLower)

      if (categoryExists) {
        // Check if any of the imports already exist
        const hasExistingImports = imports.some(importLine =>
          existingContent.includes(importLine.toLowerCase())
        )

        if (hasExistingImports) {
          debug('Imports already exist in CLAUDE.md, skipping update')
          return content
        }
      }

      // If content is empty or we need to add new content, append at the end
      let updatedContent = content.trim()

      if (updatedContent.length > 0) {
        updatedContent += '\n\n'
      }

      // Add category header if it doesn't exist
      if (!categoryExists) {
        updatedContent += `# ${categoryLabel}\n\n`
      }

      // Add imports as bullet list
      updatedContent += imports.join('\n') + '\n'

      return updatedContent
    } catch (error) {
      debug('Error processing Claude content with AST:', error)

      // Fallback: simple string concatenation
      let updatedContent = content.trim()

      if (updatedContent.length > 0) {
        updatedContent += '\n\n'
      }

      updatedContent += `# ${categoryLabel}\n\n`
      updatedContent += imports.join('\n') + '\n'

      return updatedContent
    }
  }

  /**
   * Validate that the target path doesn't escape the base directory
   */
  private validateTargetPath (targetFilePath: string, baseDirectory: string): string {
    // Step 1: Base directory is already defined

    // Step 2: Decode the path
    const decodedPath = decodeURIComponent(targetFilePath)

    // Step 3: Normalize the path
    const normalizedPath = path.normalize(decodedPath)

    // Step 4: Path construction (resolve to absolute path)
    const resolvedTargetFilePath = path.resolve(normalizedPath)

    // Step 5: Path validation - ensure it doesn't escape the base directory
    if (!resolvedTargetFilePath.startsWith(baseDirectory)) {
      throw new Error(`Invalid target path: ${targetFilePath}`)
    }

    return resolvedTargetFilePath
  }
}
