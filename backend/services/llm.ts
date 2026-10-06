import config from '../config';
import { ClaudeApiService } from './claudeapi.service';
import { OpenAIService } from './openai.service';

/**
 * Minimal contract the agents need from a language model
 */
export interface LlmService {
  readonly provider: string;
  /** Sends a prompt and parses the JSON object in the reply */
  getCompletion<T>(prompt: string): Promise<T>;
}

export const JSON_SYSTEM_PROMPT =
  'You are a financial analyst assistant providing analysis in JSON format. ' +
  'Reply with a single valid JSON object and no text outside of it.';

/**
 * Extracts the JSON object from a model reply, tolerating code fences and surrounding text
 */
export function extractJson<T>(content: string): T {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : content;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Failed to extract JSON from the model response');
  }

  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

/**
 * Creates the configured LLM service, or null when AI is disabled or no provider is set up
 */
export function createLlmService(): LlmService | null {
  if (!config.useAI) return null;

  switch (config.llmProvider) {
    case 'openai':
      return config.openAiApiKey ? new OpenAIService(config.openAiApiKey, config.openAiModel) : null;
    case 'anthropic':
      return new ClaudeApiService(config.anthropicApiKey || undefined, config.anthropicModel);
    default:
      return null;
  }
}
