import { describe, it, expect } from "vitest";
import { parseOutline } from "@/agents/outline-agent";

describe("parseOutline", () => {
  it("should parse valid JSON string", () => {
    const json = JSON.stringify({
      title: "Test Title",
      sections: [{ heading: "Section 1", keyPoints: ["Point 1"] }],
    });
    const result = parseOutline(json);
    expect(result.title).toBe("Test Title");
    expect(result.sections).toHaveLength(1);
  });

  it("should parse JSON wrapped in markdown code blocks", () => {
    const json = JSON.stringify({
      title: "Test Title",
      sections: [{ heading: "Section 1", keyPoints: ["Point 1"] }],
    });
    const markdown = "```json\n" + json + "\n```";
    const result = parseOutline(markdown);
    expect(result.title).toBe("Test Title");
    expect(result.sections).toHaveLength(1);
  });

  it("should parse JSON wrapped in markdown code blocks without language identifier", () => {
    const json = JSON.stringify({
      title: "Test Title",
      sections: [{ heading: "Section 1", keyPoints: ["Point 1"] }],
    });
    const markdown = "```\n" + json + "\n```";
    const result = parseOutline(markdown);
    expect(result.title).toBe("Test Title");
    expect(result.sections).toHaveLength(1);
  });
  
  it("should return default structure for invalid content", () => {
    const result = parseOutline("invalid json");
    expect(result.title).toBe("Untitled");
    expect(result.sections).toHaveLength(0);
  });

   it("should return default structure if JSON is missing required fields", () => {
    const json = JSON.stringify({
        foo: "bar"
    });
    const result = parseOutline(json);
    expect(result.title).toBe("Untitled"); // Fallback
    expect(result.sections).toHaveLength(0); // Fallback
  });
});
