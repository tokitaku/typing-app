import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSettings,
  saveSettings
} from "@/features/home-dashboard/storage/homeDashboardStorage";
import type { Settings } from "@/shared/types/study";

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

    storage.set(
      SETTINGS_KEY,
      JSON.stringify({
        eikenLevels: ["3", "pre2", "0", null],
        questionTypes: ["sentence", "word", "other", "word"]
      })
    );

    expect(getSettings()).toEqual({
      eikenLevels: ["3", "pre2"],
      questionTypes: ["sentence", "word"]
    });
  });

  it("normalizes settings before persisting them", () => {
    const { localStorageMock, storage } = setupWindow();

    saveSettings({
      eikenLevels: ["pre2", "pre2", "2", "invalid"],
      questionTypes: ["word", "word", "sentence", "invalid"]
    } as Settings);

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.get(SETTINGS_KEY) ?? "null")).toEqual({
      eikenLevels: ["pre2", "2"],
      questionTypes: ["word", "sentence"]
    });
  });
});
