import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt, TOOLS } from "@/lib/claude/config";
import { executeTool } from "@/lib/claude/tools";

export const maxDuration = 60;

const anthropic = new Anthropic();

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    const today = new Date().toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const todayISO = new Date().toISOString();
    const systemPrompt = getSystemPrompt(`${today} (${todayISO})`);

    // Build messages with conversation history for context
    const messages: Anthropic.MessageParam[] = [];

    // Add recent history (last ~10 messages from frontend)
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: TOOLS as any,
      messages,
    });

    // Agentic loop — keep executing tools until Claude is done
    const allActions: { tool: string; input: unknown; result: unknown }[] = [];

    while (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tool of toolBlocks) {
        let result: unknown;
        try {
          result = await executeTool(
            tool.name,
            tool.input as Record<string, unknown>
          );
        } catch (e) {
          console.error(`Tool ${tool.name} failed:`, e);
          result = { error: `Tool execution failed: ${e instanceof Error ? e.message : "unknown error"}` };
        }
        allActions.push({ tool: tool.name, input: tool.input, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: TOOLS as any,
        messages,
      });
    }

    // Extract final text
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return Response.json({ response: textContent, actions: allActions });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
