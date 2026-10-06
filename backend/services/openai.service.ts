import OpenAI from 'openai';
import { extractJson, JSON_SYSTEM_PROMPT, LlmService } from './llm';

export class OpenAIService implements LlmService {
  public readonly provider = 'openai';
  private openai: OpenAI;

  constructor(apiKey: string, private model: string = 'gpt-4o-mini') {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Gets a completion from OpenAI
   * @param prompt The text prompt to send to OpenAI
   * @returns The parsed JSON response from OpenAI
   */
  public async getCompletion<T>(prompt: string): Promise<T> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: JSON_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    });

    return extractJson<T>(response.choices[0]?.message?.content || '');
  }
}
