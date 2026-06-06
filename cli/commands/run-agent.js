import { run as runDesignerFront } from '../../lib/agents/designer-front/designer-front.js';
import { run as runBusinessAnalyst } from '../../lib/agents/business-analyst/business-analyst.js';

const AGENTS = {
  'designer-front': runDesignerFront,
  'business-analyst': runBusinessAnalyst,
};

export async function run(args) {
  const agentName = args[0];
  const featureIdIdx = args.indexOf('--feature-id');
  const featureId = featureIdIdx !== -1 ? args[featureIdIdx + 1] : 'corrector-v1';

  if (!agentName || !AGENTS[agentName]) {
    const available = Object.keys(AGENTS).join(' | ');
    console.error(`Usage: node cli run-agent <agent> [--feature-id <id>]`);
    console.error(`Available agents: ${available}`);
    process.exit(1);
  }

  try {
    await AGENTS[agentName]({ featureId });
  } catch (err) {
    console.error(`\n[run-agent] Error: ${err.message}`);
    if (err.errors) {
      console.error('[run-agent] Zod validation errors:');
      console.error(JSON.stringify(err.errors, null, 2));
    }
    process.exit(1);
  }
}
