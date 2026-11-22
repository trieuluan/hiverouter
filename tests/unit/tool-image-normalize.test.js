import { describe, expect, it } from "vitest";
import { normalizeToolOutputImages } from "../../open-sse/utils/toolImageNormalize.js";

describe("normalizeToolOutputImages", () => {
  it("lifts input_image out of Responses function_call_output into a user message", () => {
    const body = {
      input: [
        {
          type: "function_call_output",
          call_id: "call_123",
          output: JSON.stringify([
            { type: "input_text", text: "screenshot taken" },
            { type: "input_image", image_url: "data:image/png;base64,AAAA" }
          ])
        }
      ]
    };

    normalizeToolOutputImages(body);

    expect(body.input).toHaveLength(2);
    expect(body.input[0]).toEqual({
      type: "function_call_output",
      call_id: "call_123",
      output: "screenshot taken"
    });
    expect(body.input[1]).toEqual({
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: "[Image from tool result call_123]" },
        { type: "input_image", image_url: "data:image/png;base64,AAAA" }
      ]
    });
  });

  it("lifts image blocks out of Claude tool_result.content into user message content", () => {
    const body = {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_abc",
              content: [
                { type: "text", text: "ok" },
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: "BBBB" }
                }
              ]
            }
          ]
        }
      ]
    };

    normalizeToolOutputImages(body);

    expect(body.messages[0].content).toEqual([
      {
        type: "tool_result",
        tool_use_id: "toolu_abc",
        content: [{ type: "text", text: "ok" }]
      },
      { type: "text", text: "[Image from tool result toolu_abc]" },
      {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "BBBB" }
      }
    ]);
  });
});
