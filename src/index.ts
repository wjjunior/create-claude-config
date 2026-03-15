import { runWizard } from './prompts/index.js';
import { generate } from './generators/index.js';

try {
  console.log('\n🔧 create-claude-config\n');
  const config = await runWizard();
  await generate(config);
  console.log('\n✅ Configuration generated successfully!\n');
} catch (err) {
  console.error(err);
}
