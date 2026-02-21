import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import { MessageDto } from '@raven/types';
import { mcpService } from './mcp.service';

// Default to a missing key error later if not set
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'] || 'MISSING_API_KEY',
});

export class LLMService {
  /**
   * Generates a context-aware response using an LLM.
   */
  async generateResponse(
    systemPrompt: string,
    history: MessageDto[],
    model: string = 'gpt-4o-mini'
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Format history
      // Assume the newest message is at the end? Or beginning?
      // history is usually returned sorted by createdAt DESC or ASC
      // Let's sort to chronologically ASC for LLM (oldest first, newest last)
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (const msg of sortedHistory) {
        messages.push({
          role: msg.senderName === 'AI_AGENT' ? 'assistant' : 'user',
          content: msg.text || '',
        });
      }

      const allTools = await mcpService.getAllTools();
      const openAiTools: OpenAI.Chat.ChatCompletionTool[] = allTools.map((t: any) => ({
        type: 'function',
        function: {
          name: `${t._serverId}___${t.name}`,
          description: t.description || 'No description provided',
          parameters: t.inputSchema || {},
        },
      }));

      logger.info('Generating LLM response', { model, messageCount: messages.length, toolCount: openAiTools.length });

      const payload: any = {
        model,
        messages,
      };
      if (openAiTools.length > 0) {
        payload.tools = openAiTools;
      }

      let completion = await openai.chat.completions.create(payload);

      // Handle tool calls
      while (completion.choices[0]?.finish_reason === 'tool_calls') {
        const message = completion.choices[0].message;
        messages.push(message);

        for (const toolCall of message.tool_calls || []) {
          const fnName = (toolCall as any).function.name;
          const fnArgs = (toolCall as any).function.arguments;

          try {
            const [serverId, ...rest] = fnName.split('___');
            const toolName = rest.join('___');
            const parsedArgs = JSON.parse(fnArgs);

            logger.info('Executing MCP Tool', { serverId, toolName, parsedArgs });
            const result = await mcpService.callTool(serverId, toolName, parsedArgs);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (err: any) {
            logger.error('Tool execution failed', { fnName, err });
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: err.message }),
            });
          }
        }

        // Send results back to LLM
        completion = await openai.chat.completions.create(payload);
      }

      return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      logger.error('Error generating LLM response:', error);
      throw error;
    }
  }
}

export const llmService = new LLMService();
