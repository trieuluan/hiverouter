/**
 * Normalize images embedded inside tool outputs (`function_call_output` /
 * `custom_tool_call_output` in OpenAI Responses API and `tool_result` in
 * Claude Messages API) by lifting them into user-role vision parts.
 *
 * Without this, translators stringify tool-output arrays into raw base64 text,
 * inflating each screenshot into ~600k text tokens instead of ~1k vision tokens.
 */

export function extractImageUrlFromPart(part) {
  if (!part || typeof part !== "object") return null;
  if (part.type === "input_image" || part.type === "image_url") {
    if (typeof part.image_url === "string" && part.image_url) {
      return part.image_url;
    }
    if (part.image_url && typeof part.image_url.url === "string" && part.image_url.url) {
      return part.image_url.url;
    }
  }
  if (
    part.type === "image" &&
    part.source &&
    part.source.type === "base64" &&
    typeof part.source.data === "string"
  ) {
    const mediaType = part.source.media_type || "image/png";
    return `data:${mediaType};base64,${part.source.data}`;
  }
  return null;
}

export function normalizeResponsesToolImages(input) {
  if (!Array.isArray(input)) return;
  const out = [];
  let pendingImages = [];

  const flushPendingImages = () => {
    if (pendingImages.length === 0) return;
    const content = [];
    for (const img of pendingImages) {
      content.push({
        type: "input_text",
        text: `[Image from tool result ${img.callId}]`
      });
      content.push({
        type: "input_image",
        image_url: img.url,
        ...(img.detail ? { detail: img.detail } : {})
      });
    }
    out.push({
      type: "message",
      role: "user",
      content
    });
    pendingImages = [];
  };

  let changed = false;
  for (const item of input) {
    const isToolOutput =
      item &&
      typeof item === "object" &&
      (item.type === "function_call_output" ||
        item.type === "custom_tool_call_output");

    if (!isToolOutput) {
      flushPendingImages();
      out.push(item);
      continue;
    }

    let rawOutput = item.output;
    if (
      typeof rawOutput === "string" &&
      rawOutput.length > 64 &&
      (rawOutput.startsWith("[") || rawOutput.startsWith("{")) &&
      (rawOutput.includes("input_image") || rawOutput.includes("data:image/"))
    ) {
      try {
        const parsed = JSON.parse(rawOutput);
        rawOutput = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // leave as string
      }
    }

    if (Array.isArray(rawOutput)) {
      const keptText = [];
      const extracted = [];
      for (const part of rawOutput) {
        const url = extractImageUrlFromPart(part);
        if (url) {
          extracted.push({
            callId: item.call_id || item.id || "tool",
            url,
            detail: part && typeof part.detail === "string" ? part.detail : undefined
          });
        } else if (part && typeof part.text === "string") {
          keptText.push(part.text);
        } else if (typeof part === "string") {
          keptText.push(part);
        }
      }

      if (extracted.length > 0) {
        changed = true;
        pendingImages.push(...extracted);
        const callId = item.call_id || item.id || "tool";
        const replacementText =
          keptText.join("\n").trim() ||
          `[Image from tool result ${callId} attached in user message]`;
        out.push({
          ...item,
          output: replacementText
        });
        continue;
      }
    }

    out.push(item);
  }

  flushPendingImages();
  if (changed) {
    input.length = 0;
    input.push(...out);
  }
}

export function normalizeClaudeToolImages(messages) {
  if (!Array.isArray(messages)) return;
  for (const msg of messages) {
    if (!msg || msg.role !== "user" || !Array.isArray(msg.content)) continue;
    const lifted = [];
    let changed = false;
    const nextContent = msg.content.map((block) => {
      if (
        !block ||
        block.type !== "tool_result" ||
        !Array.isArray(block.content)
      ) {
        return block;
      }
      const images = block.content.filter((c) => c && c.type === "image");
      if (images.length === 0) return block;
      changed = true;
      const rest = block.content.filter((c) => !c || c.type !== "image");
      lifted.push(
        {
          type: "text",
          text: `[Image from tool result ${block.tool_use_id || "tool"}]`
        },
        ...images
      );
      return {
        ...block,
        content:
          rest.length > 0
            ? rest
            : [{ type: "text", text: "(image attached below)" }]
      };
    });
    if (changed) {
      msg.content = [...nextContent, ...lifted];
    }
  }
}

export function normalizeToolOutputImages(body) {
  if (!body || typeof body !== "object") return;
  if (Array.isArray(body.input)) {
    normalizeResponsesToolImages(body.input);
  }
  if (Array.isArray(body.messages)) {
    normalizeClaudeToolImages(body.messages);
  }
}
