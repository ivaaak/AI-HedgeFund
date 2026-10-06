import Anthropic from '@anthropic-ai/sdk';
import { extractJson, JSON_SYSTEM_PROMPT, LlmService } from './llm';

// Models that accept the server-side refusal fallback
const FALLBACK_MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

export class ClaudeApiService implements LlmService {
  public readonly provider = 'anthropic';
  private claude: Anthropic;

  // Without an explicit key the SDK resolves credentials from the environment
  constructor(apiKey?: string, private model: string = 'claude-opus-5-5') {
    this.claude = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
  }

  /**
   * Gets a completion from Claude
   * @param prompt The text prompt to send to Claude
   * @returns The parsed JSON response from Claude
   */
  public async getCompletion<T>(prompt: string): Promise<T> {
    const useFallback = FALLBACK_MODELS.includes(this.model);

    const response = await this.claude.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: JSON_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      // If the request is declined, let the API retry it on the recommended fallback model
      ...(useFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {})
    });

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude declined the request');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('Claude response was cut off before it completed');
    }

    const text = response.content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('');

    return extractJson<T>(text);
  }
}
