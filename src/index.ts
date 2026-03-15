import { isClaudeAvailable } from './auto/detect.js';
import { runAutoConfig, CancelledError } from './auto/run.js';
import { runWizard } from './prompts/index.js';
import { generate } from './generators/index.js';
import chalk from 'chalk';

try {
  console.log('\n🔧 create-claude-config\n');

  if (isClaudeAvailable()) {
    try {
      await runAutoConfig();
    } catch (err) {
      if (err instanceof CancelledError) {
        console.log('Cancelled.');
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.yellow(`\nAuto-config failed: ${msg}`));
        console.log('Falling back to manual wizard.\n');
        const config = await runWizard();
        await generate(config);
      }
    }
  } else {
    console.log('Claude Code not found, falling back to manual wizard.');
    console.log('Install Claude Code for auto-detection.\n');
    const config = await runWizard();
    await generate(config);
  }

  console.log('\n✅ Configuration generated successfully!\n');
} catch (err) {
  console.error(err);
}
