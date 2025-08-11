/**
 * Instructions for scaffolding AI app templates
 */
export interface ScaffoldInstructions {
  aiApp: string
  codeLanguage: string
  codeTopic: string
}

/**
 * Configuration for an AI app adapter
 */
export interface AiAppConfig {
  directory: string
  filesSuffix: string
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
}
