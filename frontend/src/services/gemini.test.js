import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("gemini service helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    globalThis.__TEST_GEMINI_API_KEY__ = "";
    globalThis.__TEST_API_BASE_URL__ = "";
  });

  afterEach(async () => {
    const module = await import("./gemini.js");
    module.clearCache();
    vi.unstubAllGlobals();
    delete globalThis.__TEST_GEMINI_API_KEY__;
    delete globalThis.__TEST_API_BASE_URL__;
  });

  it("builds a normalized cache key", async () => {
    const { buildCacheKey, normalizeLanguage, normalizePrompt } = await import("./gemini.js");
    expect(buildCacheKey("  How To Vote?  ", "hi")).toBe("hi::how to vote?");
    expect(buildCacheKey("  How To Vote?  ", "fr")).toBe("en::how to vote?");
    expect(normalizeLanguage("hi")).toBe("hi");
    expect(normalizeLanguage("bn")).toBe("en");
    expect(normalizePrompt("  hello  ")).toBe("hello");
  });

  it("detects demo mode when key is missing", async () => {
    const { isDemoMode } = await import("./gemini.js");
    expect(isDemoMode("")).toBe(true);
    expect(isDemoMode("your_gemini_api_key_here")).toBe(true);
    expect(isDemoMode("real-key")).toBe(false);
  });

  it("returns cached demo response on repeated prompts", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const { askGemini, clearCache } = await import("./gemini.js");
    clearCache();

    const first = await askGemini("How do I register?");
    const second = await askGemini("How do I register?");

    expect(first).toBe(second);
    expect(randomSpy).toHaveBeenCalledTimes(2);
  });

  it("throws a helpful error when the live API responds with failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: "Invalid API key" } }),
      }),
    );

    const module = await import("./gemini.js");
    globalThis.__TEST_GEMINI_API_KEY__ = "real-key";
    module.clearCache();

    await expect(module.askGemini("Explain NOTA")).rejects.toThrow("Invalid API key");
  });

  it("uses the backend chat proxy when an API base URL is configured", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: "Backend proxy answer", cached: false }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const module = await import("./gemini.js");
    globalThis.__TEST_API_BASE_URL__ = "https://api.example.com/";
    module.clearCache();

    await expect(module.askGemini("How to vote?", "hi", [{ role: "user", content: "Earlier" }]))
      .resolves.toBe("Backend proxy answer");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/",
      expect.objectContaining({ method: "POST" }),
    );

    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(requestBody).toMatchObject({ message: "How to vote?", language: "hi" });
    expect(requestBody.history).toHaveLength(1);
  });

  it("rejects empty prompts before calling the API", async () => {
    const module = await import("./gemini.js");
    globalThis.__TEST_GEMINI_API_KEY__ = "real-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(module.askGemini("   ")).rejects.toThrow("Message cannot be empty");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns text from a successful live API response", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Use Form 6 on the official voter portal." }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const module = await import("./gemini.js");
    globalThis.__TEST_GEMINI_API_KEY__ = "real-key";
    module.clearCache();

    await expect(module.askGemini(" Register me ", "en", [{ role: "assistant", content: "Sure" }]))
      .resolves.toBe("Use Form 6 on the official voter portal.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(requestBody.contents.at(-1).parts[0].text).toBe("Register me");
  });
});
