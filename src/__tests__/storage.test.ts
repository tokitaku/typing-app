import { afterEach, describe, expect, it, vi } from "vitest";
import { getSettings, saveSettings } from "@/lib/storage";
import type { Settings } from "@/types/study";

const SETTINGS_KEY = "typing-app::settings";

function setupWindow() {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    })
  };

  vi.stubGlobal(
    "window",
    { localStorage: localStorageMock } as unknown as Window & typeof globalThis
  );

  return { localStorageMock, storage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage settings", () => {
  it("normalizes malformed saved settings before returning them", () => {
    const { storage } = setupWindow();

    storage.set(SETTINGS_KEY, JSON.stringify({ levels: ["2", 4, null, ""] }));

    expect(getSettings()).toEqual({ levels: [2] });
  });

  it("normalizes settings before persisting them", () => {
    const { localStorageMock, storage } = setupWindow();

    saveSettings({ levels: [3, 3, 9, Number.NaN] } as Settings);

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.get(SETTINGS_KEY) ?? "null")).toEqual({ levels: [3] });
  });
});
