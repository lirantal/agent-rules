import path from 'node:path'
import fs from 'node:fs/promises'
import { debuglog } from 'node:util'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { frontmatter } from 'micromark-extension-frontmatter'
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter'
import { BaseAdapter, type AiAppConfig, type ScaffoldInstructions } from './base-adapter.js'

const debug = debuglog('agent-rules')

/**
 * Cursor adapter for processing instruction templates
 */
export class CursorAdapter extends BaseAdapter {
  constructor () {
    const config: AiAppConfig = {
      directory: '.cursor/rules',
      filesSuffix: '.mdc'
    }
    super(config)
  }

  /**
   * Process instructions by copying template files to the target directory
   */
  async processInstructions (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    await this.copyTemplateFiles(resolvedTemplateDirectory, resolvedTargetDirectory, this.config.filesSuffix)
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

        // Read the template file content
        const templateContent = await fs.readFile(fullTemplatePath, 'utf-8')

        // Process the content to transform frontmatter if needed
        const processedContent = this.processFrontmatter(templateContent)

        // Write to the target location
        await fs.writeFile(resolvedTargetFilePath, processedContent, 'utf-8')
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
   * Process markdown content to transform frontmatter from template format to Cursor format
   */
  private processFrontmatter (content: string): string {
    try {
      // Parse markdown content into AST using mdast-util-from-markdown with frontmatter support
      const ast = fromMarkdown(content, {
        extensions: [frontmatter(['yaml'])],
        mdastExtensions: [frontmatterFromMarkdown(['yaml'])]
      })

      // Find and transform frontmatter nodes
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

      // If we made transformations, convert back to markdown
      if (hasTransformations) {
        return toMarkdown(ast, {
          extensions: [frontmatterToMarkdown(['yaml'])]
        })
      }

      // No frontmatter or no transformations needed, return original content
      return content
    } catch (error) {
      debug('Error processing frontmatter with AST:', error)
      // If there's any error, return the original content
      return content
    }
  }

  /**
   * Transform frontmatter fields from template format to Cursor format using structured approach
   */
  private transformFrontmatterFields (frontmatterValue: string): string {
    // Transform 'applyTo' field to 'globs' field
    return frontmatterValue.replace(/^applyTo:\s*(.+)$/gm, 'globs: $1')
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
