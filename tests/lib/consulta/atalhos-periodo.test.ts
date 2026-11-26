import { expect, test } from "vitest";
import { type AtalhoPeriodo, periodoDoAtalho } from "@/lib/consulta/atalhos-periodo";

test.each([
  ["hoje", { de: "2026-11-25", ate: "2026-11-25" }],
  ["ultimos7", { de: "2026-11-19", ate: "2026-11-25" }],
  ["esteMes", { de: "2026-11-01", ate: "2026-11-25" }],
  ["mesPassado", { de: "2026-10-01", ate: "2026-10-31" }],
])("%s", (atalho, esperado) =>
  expect(periodoDoAtalho(atalho as AtalhoPeriodo, "2026-11-25")).toEqual(esperado));

test("mês passado em janeiro volta a dezembro", () =>
  expect(periodoDoAtalho("mesPassado", "2026-01-10")).toEqual({
    de: "2025-12-01",
    ate: "2025-12-31",
  }));
