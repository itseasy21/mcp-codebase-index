/**
 * Language registry for Tree-sitter grammars
 */

import type { LanguageInfo } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Registry of supported languages and their Tree-sitter grammars
 */
export class LanguageRegistry {
  private languages: Map<string, LanguageInfo> = new Map();
  private parsers: Map<string, any> = new Map();

  constructor() {
    this.registerLanguages();
  }

  /**
   * Register all supported languages
   */
  private registerLanguages(): void {
    const languages: LanguageInfo[] = [
      {
        name: 'typescript',
        extensions: ['.ts', '.tsx'],
        aliases: ['ts'],
        treeSitterName: 'typescript',
        hasGrammar: true,
      },
      {
        name: 'javascript',
        extensions: ['.js', '.jsx', '.mjs', '.cjs'],
        aliases: ['js'],
        treeSitterName: 'javascript',
        hasGrammar: true,
      },
      {
        name: 'python',
        extensions: ['.py', '.pyw'],
        aliases: ['py'],
        treeSitterName: 'python',
        hasGrammar: true,
      },
      {
        name: 'java',
        extensions: ['.java'],
        treeSitterName: 'java',
        hasGrammar: true,
      },
      {
        name: 'go',
        extensions: ['.go'],
        treeSitterName: 'go',
        hasGrammar: true,
      },
      {
        name: 'rust',
        extensions: ['.rs'],
        aliases: ['rs'],
        treeSitterName: 'rust',
        hasGrammar: true,
      },
      {
        name: 'c',
        extensions: ['.c', '.h'],
        treeSitterName: 'c',
        hasGrammar: true,
      },
      {
        name: 'cpp',
        extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
        aliases: ['c++', 'cxx'],
        treeSitterName: 'cpp',
        hasGrammar: true,
      },
      {
        name: 'csharp',
        extensions: ['.cs'],
        aliases: ['c#', 'cs'],
        treeSitterName: 'c_sharp',
        hasGrammar: true,
      },
      {
        name: 'ruby',
        extensions: ['.rb'],
        aliases: ['rb'],
        treeSitterName: 'ruby',
        hasGrammar: true,
      },
      {
        name: 'php',
        extensions: ['.php'],
        treeSitterName: 'php',
        hasGrammar: true,
      },
      {
        name: 'kotlin',
        extensions: ['.kt', '.kts'],
        treeSitterName: 'kotlin',
        hasGrammar: true,
      },
      {
        name: 'swift',
        extensions: ['.swift'],
        treeSitterName: 'swift',
        hasGrammar: true,
      },
      {
        name: 'markdown',
        extensions: ['.md', '.markdown'],
        aliases: ['md'],
        hasGrammar: false, // Special handling
      },
      {
        name: 'json',
        extensions: ['.json'],
        hasGrammar: false,
      },
      {
        name: 'yaml',
        extensions: ['.yaml', '.yml'],
        hasGrammar: false,
      },
    ];

    for (const lang of languages) {
      this.languages.set(lang.name, lang);

      // Also register by extensions
      for (const ext of lang.extensions) {
        this.languages.set(ext, lang);
      }

      // Register by aliases
      if (lang.aliases) {
        for (const alias of lang.aliases) {
          this.languages.set(alias, lang);
        }
      }
    }

    logger.debug(`Registered ${languages.length} languages`);
  }

  /**
   * Get language info by name or extension
   */
  getLanguage(nameOrExt: string): LanguageInfo | undefined {
    return this.languages.get(nameOrExt.toLowerCase());
  }

  /**
   * Check if language is supported
   */
  isSupported(language: string): boolean {
    const lang = this.getLanguage(language);
    return lang !== undefined;
  }

  /**
   * Check if language has Tree-sitter grammar
   */
  hasGrammar(language: string): boolean {
    const lang = this.getLanguage(language);
    return lang?.hasGrammar ?? false;
  }

  /**
   * Get Tree-sitter parser for language
   */
  async getParser(language: string): Promise<any | null> {
    const lang = this.getLanguage(language);

    if (!lang || !lang.hasGrammar) {
      return null;
    }

    // Return cached parser if available
    if (this.parsers.has(lang.name)) {
      return this.parsers.get(lang.name)!;
    }

    // Load parser dynamically
    try {
      const parserLang = await this.loadGrammar(lang.treeSitterName || lang.name);
      this.parsers.set(lang.name, parserLang);
      return parserLang;
    } catch (error) {
      logger.error(`Failed to load grammar for ${lang.name}:`, error);
      return null;
    }
  }

  /**
   * Load Tree-sitter grammar dynamically
   */
  private async loadGrammar(grammarName: string): Promise<any> {
    try {
      // Dynamically import the grammar
      // Note: The actual grammar package names follow the pattern tree-sitter-{language}
      const moduleName = `tree-sitter-${grammarName}`;
      const module = await import(moduleName);
      return module.default || module;
    } catch (error) {
      logger.warn(`Could not load grammar ${grammarName}, trying alternative...`);
      throw error;
    }
  }

  /**
   * Get all supported languages
   */
  getAllLanguages(): LanguageInfo[] {
    const uniqueLanguages = new Map<string, LanguageInfo>();

    for (const lang of this.languages.values()) {
      if (!uniqueLanguages.has(lang.name)) {
        uniqueLanguages.set(lang.name, lang);
      }
    }

    return Array.from(uniqueLanguages.values());
  }

  /**
   * Get supported extensions
   */
  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();

    for (const lang of this.languages.values()) {
      lang.extensions.forEach(ext => extensions.add(ext));
    }

    return Array.from(extensions);
  }
}

// Global language registry instance
export const languageRegistry = new LanguageRegistry();
