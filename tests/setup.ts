import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { zerarParametros } from "@/lib/api/parametros";
import { zerarPendentes } from "@/lib/armazenamento/pendentes";
import { zerarResultadosEmMemoria } from "@/lib/armazenamento/resultados";
import { servidor, zerarContagem } from "./servidor";

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  servidor.resetHandlers();
  zerarContagem();
  zerarParametros();
  zerarPendentes();
  zerarResultadosEmMemoria();
  vi.useRealTimers();
  if (typeof window !== "undefined") {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});

afterAll(() => servidor.close());
