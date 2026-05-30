#!/usr/bin/env node
// Punto de entrada CLI: node cli <command> [options]
// Comandos: create-project | run-agent | validate | reconcile | generate-docs

const [,, command, ...args] = process.argv;

const commands = {
  'create-project': () => import('./commands/create-project.js'),
  'run-agent':      () => import('./commands/run-agent.js'),
  'validate':       () => import('./commands/validate.js'),
  'reconcile':      () => import('./commands/reconcile.js'),
  'generate-docs':  () => import('./commands/generate-docs.js'),
};

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  console.error(`Available: ${Object.keys(commands).join(' | ')}`);
  process.exit(1);
}

commands[command]().then(m => m.run(args));
