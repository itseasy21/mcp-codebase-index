/**
 * Manual parser testing script
 */

import { codeParser } from '../src/parser/index.js';
import { logger } from '../src/utils/logger.js';

async function testParser() {
  logger.info('Testing Code Parser...');

  const testFile = './tests/fixtures/sample.ts';

  try {
    logger.info(`\nParsing ${testFile}...`);
    const result = await codeParser.parseFile(testFile);

    logger.info(`\n✓ Successfully parsed ${testFile}`);
    logger.info(`  Language: ${result.language}`);
    logger.info(`  Blocks extracted: ${result.blocks.length}`);

    if (result.errors && result.errors.length > 0) {
      logger.warn(`  Errors: ${result.errors.length}`);
    }

    logger.info('\nExtracted blocks:');
    for (const block of result.blocks) {
      logger.info(`  - ${block.type}: ${block.name} (lines ${block.line}-${block.endLine})`);
    }

    logger.info('\n✓ Parser test completed successfully');
  } catch (error) {
    logger.error('Parser test failed:', error);
    process.exit(1);
  }
}

testParser();
