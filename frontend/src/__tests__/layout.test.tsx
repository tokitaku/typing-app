import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "mock-inter"
  })
}));

describe("root layout", () => {
  it("adds the Tailwind verification utility class to body", async () => {
    // Dynamic import 先の JSX 評価で React グローバルが必要になる。
    globalThis.React = React;
    const { default: RootLayout } = await import("@/app/layout");
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child</div>
      </RootLayout>
    );

    expect(html).toMatch(/<body[^>]*class="[^"]*antialiased[^"]*"/);
  });
});
