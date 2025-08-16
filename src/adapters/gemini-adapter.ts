import path from 'node:path'
import fs from 'node:fs/promises'
import { debuglog } from 'node:util'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { BaseAdapter, type AiAppConfig, type ScaffoldInstructions } from './base-adapter.js'

const debug = debuglog('agent-rules')

/**
 * Gemini adapter for processing instruction templates
 */
export class GeminiAdapter extends BaseAdapter {
  private static readonly GEMINI_MAIN_FILE = 'GEMINI.md'

  // Map topic values to their display labels from CLI
  private static readonly TOPIC_LABELS: Record<string, string> = {
    'secure-code': 'Secure Coding',
    'security-vulnerabilities': 'Security Vulnerabilities',
    testing: 'Testing'
  }

  constructor () {
    const config: AiAppConfig = {
      directory: '.gemini/rules',
      filesSuffix: '.md'
    }
    super(config)
  }

  /**
   * Process instructions by copying template files and updating GEMINI.md with imports
   */
  async processInstructions (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    // Copy template files to gemini/rules directory
    await this.copyTemplateFiles(resolvedTemplateDirectory, resolvedTargetDirectory, this.config.filesSuffix)

    // Update GEMINI.md with imports
    await this.updateGeminiMainFile(scaffoldInstructions, resolvedTemplateDirectory, resolvedTargetDirectory)
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

        // Read template file content and strip frontmatter
        const templateContent = await fs.readFile(fullTemplatePath, 'utf-8')
        const processedContent = this.stripFrontmatter(templateContent)
        await fs.writeFile(resolvedTargetFilePath, processedContent, 'utf-8')
      }
    } catch (error) {
      console.warn(`Skipping file ${sanitizedTemplateFile}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Strip YAML frontmatter from markdown content since Gemini doesn't support it
   */
  private stripFrontmatter (content: string): string {
    // Check if content starts with frontmatter (---)
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (match && match[2] !== undefined) {
      // Return content without frontmatter
      return match[2]
    }

    // Return original content if no frontmatter found
    return content
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
   * Update the main GEMINI.md file with imports for the processed templates
   */
  private async updateGeminiMainFile (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    // Get the project root directory (parent of .gemini/rules)
    const projectRoot = path.dirname(path.dirname(resolvedTargetDirectory))
    const geminiMainFilePath = path.join(projectRoot, GeminiAdapter.GEMINI_MAIN_FILE)

    debug('Gemini main file path:', geminiMainFilePath)

    // Read existing content or create new content
    let geminiContent = ''
    try {
      geminiContent = await fs.readFile(geminiMainFilePath, 'utf-8')
    } catch (error) {
      debug('GEMINI.md not found, creating new file')
      geminiContent = ''
    }

    // Get the list of template files to generate imports
    const templateFiles = await fs.readdir(resolvedTemplateDirectory)
    const imports = templateFiles
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const targetFileName = this.generateTargetFileName(file, this.config.filesSuffix)
        return `@./.gemini/rules/${targetFileName}`
      })

    if (imports.length === 0) {
      debug('No template files to import')
      return
    }

    // Get the topic label for the category header
    const topicLabel = GeminiAdapter.TOPIC_LABELS[scaffoldInstructions.codeTopic] || scaffoldInstructions.codeTopic

    // Update the content with imports
    const updatedContent = this.addImportsToGeminiContent(geminiContent, topicLabel, imports)

    // Write the updated content back to GEMINI.md
    await fs.writeFile(geminiMainFilePath, updatedContent, 'utf-8')
    debug('Updated GEMINI.md with imports for topic:', topicLabel)
  }

  /**
   * Add imports to Gemini content, avoiding duplicates and organizing by categories
   */
  private addImportsToGeminiContent (content: string, categoryLabel: string, imports: string[]): string {
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
          debug('Imports already exist in GEMINI.md, skipping update')
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

      // Add imports using @ syntax (no bullet points for Gemini)
      updatedContent += imports.join('\n') + '\n'

      return updatedContent
    } catch (error) {
      debug('Error processing Gemini content with AST:', error)

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
