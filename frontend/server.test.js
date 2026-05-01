import { describe, expect, it } from "vitest";

import { getContentType, resolveRequestPath, resolveStaticFilePath } from "./server.js";

describe("production static server helpers", () => {
  it("returns expected content types", () => {
    expect(getContentType("index.html")).toBe("text/html; charset=utf-8");
    expect(getContentType("bundle.js")).toBe("application/javascript; charset=utf-8");
    expect(getContentType("asset.unknown")).toBe("application/octet-stream");
  });

  it("maps root requests to the SPA entry file", () => {
    expect(resolveRequestPath("/")).toBe("/index.html");
    expect(resolveRequestPath("/assets/app.js")).toBe("/assets/app.js");
  });

  it("rejects malformed or traversal request paths", () => {
    expect(resolveRequestPath("/assets/%E0%A4%A")).toBeNull();
    expect(resolveRequestPath("/../.env")).toBeNull();
    expect(resolveRequestPath("/assets/..%2F.env")).toBeNull();
  });

  it("keeps static file resolution inside the build directory", () => {
    const resolved = resolveStaticFilePath("/assets/app.js");
    expect(resolved).toContain("dist");
    expect(resolveStaticFilePath("/../package.json")).toBeNull();
  });
});
