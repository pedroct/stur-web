import { diaEmFortaleza, formatarHora, formatarInstante, hojeEmFortaleza } from "@/lib/tempo";

test("hora do instante no fuso de Fortaleza, com TZ=UTC na máquina", () => {
  expect(formatarHora("2026-11-25T01:48:00+00:00")).toBe("22h48");
  expect(formatarHora("2026-11-24T22:48:13.123456-03:00")).toBe("22h48"); // formato do backend
});

test("hoje em Fortaleza vira o dia antes da meia-noite UTC", () =>
  expect(hojeEmFortaleza(new Date("2026-11-25T02:00:00Z"))).toBe("2026-11-24"));

test("dia do instante no fuso de Fortaleza", () => {
  expect(diaEmFortaleza("2026-11-25T02:00:00+00:00")).toBe("2026-11-24");
  expect(diaEmFortaleza("2026-11-24T22:48:13.123456-03:00")).toBe("2026-11-24");
  expect(diaEmFortaleza("2026-11-25T03:00:00.000000+00:00")).toBe("2026-11-25");
});

test("instante da consulta com dia e hora em Fortaleza", () => {
  expect(formatarInstante("2026-11-24T22:48:05.000001-03:00")).toBe("24/11/2026 às 22:48");
  expect(formatarInstante("2026-11-25T01:48:00+00:00")).toBe("24/11/2026 às 22:48");
});
