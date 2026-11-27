import { dataSolta, listaDeDatas, periodoCurto, periodoSomado } from "@/lib/venda/datas";

test("períodos", () => {
  expect(periodoCurto("2026-11-15", "2026-11-22")).toBe("15/11 a 22/11/2026");
  expect(periodoCurto("2026-11-15", "2026-11-15")).toBe("15/11/2026");
  expect(periodoCurto(null, "2026-11-22")).toBe("22/11/2026");
  expect(periodoCurto("2026-11-14", "2026-12-02")).toBe("14/11 a 02/12/2026");
  expect(periodoCurto("2025-12-28", "2026-01-05")).toBe("28/12/2025 a 05/01/2026");
});

test("período com hora, com uma ponta só e sem pontas", () => {
  expect(periodoCurto("2026-11-15 00:00:00", "2026-11-22T10:30:00")).toBe("15/11 a 22/11/2026");
  expect(periodoCurto("2026-11-15 00:00:00", "2026-11-15 23:00:00")).toBe("15/11/2026");
  expect(periodoCurto("2026-11-15", null)).toBe("15/11/2026");
  expect(periodoCurto(null, null)).toBeNull();
});

test("lista e data solta", () => {
  expect(listaDeDatas(["2026-06-09", "2026-06-30", "2026-11-10"])).toBe(
    "09/06, 30/06 e 10/11/2026",
  );
  expect(dataSolta("2027-02-04", "2026-11-24")).toBe("04/02/2027");
});

test("data solta do mesmo ano não leva o ano", () => {
  expect(dataSolta("2026-11-22", "2026-11-24")).toBe("22/11");
  expect(dataSolta("2026-11-22 10:30:00", "2026-11-24")).toBe("22/11");
});

test("lista com anos diferentes, com uma data e vazia", () => {
  expect(listaDeDatas(["2025-12-28", "2026-01-05"])).toBe("28/12/2025 e 05/01/2026");
  expect(listaDeDatas(["2026-01-05"])).toBe("05/01/2026");
  expect(listaDeDatas([])).toBe("");
});

test("período somado: a menor data de início e a maior de fim, fora de ordem", () => {
  expect(
    periodoSomado(
      ["2026-11-15 00:00:00", "2026-11-10 00:00:00"],
      ["2026-11-13 00:00:00", "2026-11-20 00:00:00"],
    ),
  ).toBe("10/11 a 20/11/2026");
  expect(periodoSomado([], ["2026-11-20"])).toBe("20/11/2026");
  expect(periodoSomado([], [])).toBeNull();
});
