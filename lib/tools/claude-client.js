import Anthropic from '@anthropic-ai/sdk';

let _client = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env or export it in your shell.');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function createMessage(params) {
  return getClient().messages.create(params);
}

export function extractToolInput(response) {
  const block = response.content.find(b => b.type === 'tool_use');
  if (!block) throw new Error('No tool_use block in response');
  return block.input;
}

export function extractText(response) {
  return response.content.find(b => b.type === 'text')?.text ?? '';
}
