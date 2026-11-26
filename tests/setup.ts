import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  if (typeof window !== "undefined") {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});
