import { BaseAdapter } from './base-adapter.js'
import { GitHubCopilotAdapter } from './github-copilot-adapter.js'
import { CursorAdapter } from './cursor-adapter.js'
import { ClaudeCodeAdapter } from './claude-code-adapter.js'

/**
 * Registry of AI app adapters
 */
export class AdapterRegistry {
  private static readonly adapters = new Map<string, () => BaseAdapter>([
    ['github-copilot', () => new GitHubCopilotAdapter()],
    ['cursor', () => new CursorAdapter()],
    ['claude-code', () => new ClaudeCodeAdapter()]
  ])

  /**
   * Get an adapter instance for the specified AI app
   * @param aiApp - The AI app identifier
   * @returns The adapter instance
   * @throws Error if the AI app is not supported
   */
  static getAdapter (aiApp: string): BaseAdapter {
    const adapterFactory = this.adapters.get(aiApp)
    if (!adapterFactory) {
      throw new Error(`AI App "${aiApp}" is not supported.`)
    }
    return adapterFactory()
  }

  /**
   * Get the list of supported AI apps
   * @returns Array of supported AI app identifiers
   */
  static getSupportedAiApps (): string[] {
    return Array.from(this.adapters.keys())
  }
}
