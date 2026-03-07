import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt, TOOLS } from "@/lib/claude/config";
import { executeTool } from "@/lib/claude/tools";

export const maxDuration = 60;

const anthropic = new Anthropic();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[chat] incoming body keys:", Object.keys(body), "message length:", body.message?.length, "files:", body.files?.length);
    const { message, history, user, files } = body;

    if ((!message || typeof message !== "string") && (!files || !files.length)) {
      console.log("[chat] rejected: missing message");
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    const today = new Date().toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jerusalem",
    });
    const todayISO = new Date().toLocaleString("sv-SE", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).replace(" ", "T") + "+02:00";
    const activeUser = user || "shared";
    const systemPrompt = getSystemPrompt(`${today} (${todayISO})`, activeUser);

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

    // Add current message (with optional images/PDFs via URL)
    if (Array.isArray(files) && files.length > 0) {
      const contentBlocks: Anthropic.ContentBlockParam[] = [];
      for (const file of files.slice(0, 4)) {
        if (!file.url) continue;
        if (file.kind === "pdf" || file.media_type === "application/pdf") {
          contentBlocks.push({
            type: "document",
            source: { type: "url", url: file.url },
          });
        } else if (file.media_type?.startsWith("image/")) {
          contentBlocks.push({
            type: "image",
            source: { type: "url", url: file.url },
          });
        }
      }
      contentBlocks.push({ type: "text", text: message || "מה יש בקובץ?" });
      messages.push({ role: "user", content: contentBlocks });
    } else {
      messages.push({ role: "user", content: message });
    }

    console.log("[chat] calling Claude, model: claude-sonnet-4-6, messages:", messages.length, "tools:", TOOLS.length);
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: TOOLS as any,
      messages,
    });
    console.log("[chat] Claude response, stop_reason:", response.stop_reason, "content blocks:", response.content.length);

    // Agentic loop — keep executing tools until Claude is done
    const allActions: { tool: string; input: unknown; result: unknown }[] = [];

    while (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tool of toolBlocks) {
        console.log("[chat] executing tool:", tool.name, "input:", JSON.stringify(tool.input).slice(0, 200));
        let result: unknown;
        try {
          result = await executeTool(
            tool.name,
            tool.input as Record<string, unknown>
          );
          console.log("[chat] tool result:", JSON.stringify(result).slice(0, 200));
        } catch (e) {
          console.error(`[chat] Tool ${tool.name} failed:`, e);
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
    console.error("[chat] ERROR:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[chat] error message:", msg);
    return Response.json(
      { error: msg },
      { status: 500 }
    );
  }
}
