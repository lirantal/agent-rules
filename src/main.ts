import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { debuglog } from 'node:util'
import { AdapterRegistry, type ScaffoldInstructions, type AiAppConfig } from './adapters/index.js'

const debug = debuglog('agent-rules')
const templateRoot = '__template__'

// Simple path resolution because templates are copied to dist during build
// see package.json scripts for the build process but we also want to support
// running from source in dev `npm run start` where this file lives in src/
function resolvePackageRootDirectoryForTemplates (): string {
  let guessedDirName: string = ''
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      // ESM environment - templates are in dist/__template__
      const __filename = fileURLToPath(import.meta.url)
      guessedDirName = path.dirname(__filename)
    } else {
      guessedDirName = __dirname
    }
  } catch (error) {
    // CJS fallback - assume we're in a distributed package
    // In CJS, we don't have import.meta, so use __dirname
    guessedDirName = __dirname
  }

  // If we're in dist/bin, go up one level to dist
  // If we're already in dist, stay there
  if (guessedDirName.endsWith('src')) {
    // If we're in src, we need to go up one level to root
    return path.resolve(guessedDirName, '..')
  } else if (guessedDirName.endsWith('dist/bin') || guessedDirName.endsWith('dist\\bin')) {
    return path.resolve(guessedDirName, '..')
  } else {
    return guessedDirName
  }
}

export function getAiAppDirectory (aiApp: string): AiAppConfig {
  const adapter = AdapterRegistry.getAdapter(aiApp)
  return adapter.getConfig()
}

export async function resolveTemplateDirectory (scaffoldInstructions: ScaffoldInstructions): Promise<string> {
  const { codeLanguage, codeTopic } = scaffoldInstructions

  const currentFileDirectory = resolvePackageRootDirectoryForTemplates()
  const templateDirectory = path.join(currentFileDirectory, templateRoot, codeLanguage, codeTopic)
  const resolvedTemplateDirectory = path.resolve(templateDirectory)

  try {
    const templateStats = await fs.stat(resolvedTemplateDirectory)
    if (!templateStats.isDirectory()) {
      throw new Error(`Template directory is not a directory: ${resolvedTemplateDirectory}`)
    }
  } catch (error) {
    throw new Error(`Template directory not found: ${resolvedTemplateDirectory}`)
  }

  return resolvedTemplateDirectory
}

async function createTargetDirectory (directory: string): Promise<string> {
  const resolvedTargetDirectory = path.resolve(directory)
  await fs.mkdir(resolvedTargetDirectory, { recursive: true })
  return resolvedTargetDirectory
}

export async function scaffoldAiAppInstructions (scaffoldInstructions: ScaffoldInstructions): Promise<void> {
  const { aiApp, codeLanguage, codeTopic } = scaffoldInstructions
  if (!aiApp || !codeLanguage || !codeTopic) {
    throw new Error('Scaffold instructions must include aiApp and all other template choices.')
  }

  const adapter = AdapterRegistry.getAdapter(aiApp)
  const aiAppConfig = adapter.getConfig()
  const { directory } = aiAppConfig

  debug(`Scaffolding AI App instructions in directory: ${directory} with adapter: ${aiApp}`)

  // Resolve and validate template directory, then ensure target directory exists
  const resolvedTemplateDirectory = await resolveTemplateDirectory(scaffoldInstructions)
  const resolvedTargetDirectory = await createTargetDirectory(directory)

  // Use the adapter to process the instructions
  await adapter.processInstructions(scaffoldInstructions, resolvedTemplateDirectory, resolvedTargetDirectory)
}
