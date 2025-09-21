import path from 'node:path'
import fs from 'node:fs/promises'
import { debuglog } from 'node:util'

const debug = debuglog('agent-rules')

/**
 * Instructions for scaffolding AI app templates
 */
export interface ScaffoldInstructions {
  aiApp: string
  codeLanguage: string
  codeTopic: string
  includeMcp?: boolean
}

/**
 * Configuration for an AI app adapter
 */
export interface AiAppConfig {
  directory: string
  filesSuffix: string
}

/**
 * Configuration for MCP (Model Context Protocol) setup for an AI app
 */
export interface McpConfig {
  /** Target file path for MCP configuration (relative to project root) */
  filePath: string
  /** JSON key name for merging MCP servers (defaults to 'mcpServers') */
  mergeKey?: string
}

/**
 * Base adapter interface for AI apps
 */
export abstract class BaseAdapter {
  protected readonly config: AiAppConfig

  constructor (config: AiAppConfig) {
    this.config = config
  }

  /**
   * Get the configuration for this AI app
   */
  getConfig (): AiAppConfig {
    return this.config
  }

  /**
   * Process and scaffold AI app instructions based on the provided scaffold instructions
   * @param scaffoldInstructions - The instructions containing template choices
   * @param resolvedTemplateDirectory - The resolved path to the template directory
   * @param resolvedTargetDirectory - The resolved path to the target directory
   */
  abstract processInstructions (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void>

  /**
   * Get MCP configuration for this AI app
   * Returns null if MCP is not supported by this adapter
   */
  abstract getMcpConfig (): McpConfig | null

  /**
   * Process MCP configuration (optional override)
   * Default implementation handles JSON merging
   * @param scaffoldInstructions - The instructions containing template choices
   * @param resolvedMcpTemplateDirectory - The resolved path to the MCP template directory
   * @param resolvedTargetDirectory - The resolved path to the target directory
   */
  async processMcpConfiguration (
    scaffoldInstructions: ScaffoldInstructions,
    resolvedMcpTemplateDirectory: string,
    resolvedTargetDirectory: string
  ): Promise<void> {
    const mcpConfig = this.getMcpConfig()
    if (!mcpConfig) return

    const templateMcpFile = path.join(resolvedMcpTemplateDirectory, 'mcp.json')
    // Resolve MCP target file relative to project root (current working directory)
    const targetMcpFile = path.resolve(process.cwd(), mcpConfig.filePath)
    const mergeKey = mcpConfig.mergeKey || 'mcpServers'

    debug(`Processing MCP configuration from ${templateMcpFile} to ${targetMcpFile}`)

    try {
      // Read template MCP configuration
      const templateContent = await fs.readFile(templateMcpFile, 'utf-8')
      const templateMcpConfig = JSON.parse(templateContent) as Record<string, unknown>

      // Safely extract template servers using safe property access
      // Try the specified mergeKey first, then fall back to 'mcpServers' (default template format)
      let templateServers: Record<string, unknown> = {}
      const keysToTry = mergeKey === 'mcpServers' ? ['mcpServers'] : [mergeKey, 'mcpServers']

      for (const key of keysToTry) {
        if (Object.hasOwn(templateMcpConfig, key)) {
          const templateValue = Reflect.get(templateMcpConfig, key)
          if (templateValue && typeof templateValue === 'object' && !Array.isArray(templateValue)) {
            templateServers = templateValue as Record<string, unknown>
            break
          }
        }
      }

      // Read existing target configuration (if exists)
      let existingConfig: Record<string, unknown> = {}
      try {
        const existingContent = await fs.readFile(targetMcpFile, 'utf-8')
        existingConfig = JSON.parse(existingContent) as Record<string, unknown>
      } catch (error) {
        // File doesn't exist, start with empty config
        debug(`Target MCP file does not exist, creating new one: ${targetMcpFile}`)
      }

      // Safely extract existing servers using safe property access
      let existingServers: Record<string, unknown> = {}
      if (Object.hasOwn(existingConfig, mergeKey)) {
        const existingValue = Reflect.get(existingConfig, mergeKey)
        if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)) {
          existingServers = existingValue as Record<string, unknown>
        }
      }

      // Merge configurations
      const mergedConfig = {
        ...existingConfig,
        [mergeKey]: {
          ...existingServers,
          ...templateServers
        }
      }

      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetMcpFile), { recursive: true })

      // Write merged configuration
      await fs.writeFile(targetMcpFile, JSON.stringify(mergedConfig, null, 2), 'utf-8')

      debug(`MCP configuration merged into: ${targetMcpFile}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`Warning: Failed to process MCP configuration: ${errorMessage}`)
    }
  }
}
