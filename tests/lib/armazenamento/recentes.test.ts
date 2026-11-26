import {
  descreverQuando,
  detalheRecenteDaReserva,
  detalheRecenteDoPeriodo,
  lerRecentes,
  registrarRecente,
} from "@/lib/armazenamento/recentes";
import { reserva, resumoVenda } from "../../fabrica";

const AGORA = new Date("2026-11-25T14:00:00-03:00");

function registro(n: number) {
  return { endereco: `/consulta?n=${n}`, descricao: `Consulta ${n}`, detalhe: `${n} vendas` };
}

test("sem nada guardado, não há recentes", () => {
  expect(lerRecentes()).toEqual([]);
});

test("grava o instante em ISO e lê de volta", () => {
  registrarRecente(registro(1), AGORA);
  expect(lerRecentes()).toEqual([{ ...registro(1), quando: "2026-11-25T17:00:00.000Z" }]);
  expect(JSON.parse(localStorage.getItem("stur-web:recentes") ?? "[]")).toHaveLength(1);
});

test("recentes: 8 no máximo, repetido sobe", () => {
  for (let n = 1; n <= 9; n++) registrarRecente(registro(n), AGORA);
  expect(lerRecentes()).toHaveLength(8);
  expect(lerRecentes()[0]?.endereco).toBe("/consulta?n=9");
  expect(lerRecentes().some((r) => r.endereco === "/consulta?n=1")).toBe(false);

  registrarRecente({ ...registro(3), detalhe: "novo" }, AGORA);
  const recentes = lerRecentes();
  expect(recentes).toHaveLength(8);
  expect(recentes[0]).toMatchObject({ endereco: "/consulta?n=3", detalhe: "novo" });
  expect(recentes.filter((r) => r.endereco === "/consulta?n=3")).toHaveLength(1);
});

test("JSON inválido ou fora do formato vira lista vazia", () => {
  localStorage.setItem("stur-web:recentes", "{não é json");
  expect(lerRecentes()).toEqual([]);
  localStorage.setItem("stur-web:recentes", JSON.stringify({ a: 1 }));
  expect(lerRecentes()).toEqual([]);
  localStorage.setItem("stur-web:recentes", JSON.stringify([{ endereco: 1 }, null]));
  expect(lerRecentes()).toEqual([]);
});

test.each([
  ["2026-11-25T13:59:40-03:00", "agora"],
  ["2026-11-25T13:58:00-03:00", "há 2 min"],
  ["2026-11-25T09:05:00-03:00", "hoje, 09h05"],
  ["2026-11-24T16:40:00-03:00", "ontem, 16h40"],
  ["2026-11-20T11:05:00-03:00", "20/11, 11h05"],
])("descreverQuando(%s)", (quando, texto) => {
  expect(descreverQuando(quando, AGORA)).toBe(texto);
});

test("descreverQuando usa o dia de Fortaleza, não o do navegador", () => {
  const agora = new Date("2026-11-25T23:30:00-03:00");
  expect(descreverQuando("2026-11-25T22:00:00-03:00", agora)).toBe("hoje, 22h00");
  expect(descreverQuando("2026-11-24T23:50:00-03:00", agora)).toBe("ontem, 23h50");
});

test("descreverQuando na virada do mês e do ano", () => {
  expect(descreverQuando("2026-12-31T10:00:00-03:00", new Date("2027-01-01T09:00:00-03:00"))).toBe(
    "ontem, 10h00",
  );
});

test("detalhe do período", () => {
  expect(detalheRecenteDoPeriodo(1)).toBe("1 venda");
  expect(detalheRecenteDoPeriodo(54)).toBe("54 vendas");
});

test("detalhe da reserva", () => {
  const r1 = reserva(90000001, [resumoVenda({ produto: "BILHETE NACIONAL" })]);
  expect(detalheRecenteDaReserva(r1.reserva.vendas)).toBe("BILHETE NACIONAL");
  expect(
    detalheRecenteDaReserva(
      reserva(90000001, [resumoVenda(), resumoVenda({ idreserva: 1002 })]).reserva.vendas,
    ),
  ).toBe("2 vendas");
  const semProduto = reserva(90000001, [resumoVenda({ produto: null })]);
  expect(detalheRecenteDaReserva(semProduto.reserva.vendas)).toBe("1 venda");
});
