import { expect, test } from "vitest";
import { CONSULTA_VAZIA, type Situacao } from "@/lib/consulta/consulta";
import {
  descreverFiltros,
  periodoAteCopia,
  resumoMarcados,
  rodapeErro,
  rotuloConsultarAteCopia,
  textoCarregando,
  textoDadosAteSemVendas,
  textoPeriodoAteCopia,
  textoSemVendas,
  textoSemVendasNumero,
  tituloConsulta,
  tituloCurto,
} from "@/lib/consulta/descricao";

const periodo = { ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" };

test("títulos", () => {
  expect(tituloConsulta(periodo)).toBe("Vendas emitidas de 17/11 a 24/11/2026");
  expect(tituloCurto(periodo)).toBe("Vendas emitidas de 17/11 a 24/11");
  expect(
    tituloConsulta({ ...periodo, tipoData: "alteracao", de: "2025-12-28", ate: "2026-01-05" }),
  ).toBe("Vendas alteradas de 28/12/2025 a 05/01/2026");
  expect(tituloConsulta({ ...periodo, reserva: 90000001 })).toBe(
    "Reserva 90000001, emitida de 17/11 a 24/11/2026",
  );
  expect(tituloConsulta({ ...CONSULTA_VAZIA, reserva: 90000001, fornecedor: "AEREA EXEMPLO" })).toBe(
    "Reserva 90000001",
  );
});

test("filtros da consulta em texto", () => {
  expect(descreverFiltros(periodo)).toBe("Sem filtros na consulta");
  expect(descreverFiltros({ ...periodo, situacao: ["reservada"], fornecedor: "AEREA EXEMPLO" })).toBe(
    "Reservadas, fornecedor AEREA EXEMPLO",
  );
  expect(
    descreverFiltros({
      ...periodo,
      situacao: ["reservada", "confirmada"],
      classificacao: ["aereo", "hotelaria"],
      cliente: "GAMA",
    }),
  ).toBe("Reservadas e confirmadas, aéreo e hotelaria, cliente GAMA");
});

test("resumo do quadro recolhido", () => {
  expect(resumoMarcados(periodo)).toBe("nenhum marcado");
  expect(resumoMarcados({ ...periodo, situacao: ["reservada"], fornecedor: "AEREA EXEMPLO" })).toBe(
    "2 marcados: Reservada, fornecedor AEREA EXEMPLO",
  );
  expect(resumoMarcados({ ...periodo, classificacao: ["pacote"] })).toBe("1 marcado: Pacote");
});

test("carregando", () => {
  expect(textoCarregando(periodo, 30)).toBe(
    "Consultando as vendas emitidas de 17/11 a 24/11/2026 na API do Stur. Pode levar até 30 segundos.",
  );
  expect(textoCarregando({ ...CONSULTA_VAZIA, reserva: 90000001 }, 30)).toBe(
    "Consultando a reserva 90000001 na API do Stur. Pode levar até 30 segundos.",
  );
});

test("nenhuma venda", () => {
  expect(textoSemVendas({ ...periodo, de: "2026-11-19" })).toBe(
    "A API do Stur não devolveu nenhuma venda emitida de 19/11 a 24/11/2026. Verifique as datas e consulte de novo.",
  );
  expect(textoSemVendas({ ...CONSULTA_VAZIA, reserva: 90000099 })).toBe(
    "Nenhuma venda com o número de reserva 90000099. Verifique o número no Stur e consulte de novo.",
  );
  expect(textoSemVendas({ ...periodo, reserva: 90000099 })).toBe(
    "Nenhuma venda com o número de reserva 90000099 nesse período. Verifique o número no Stur ou amplie o período e consulte de novo.",
  );
  expect(
    textoDadosAteSemVendas({ ...CONSULTA_VAZIA, reserva: 90000099 }, "2026-11-18T09:30:00"),
  ).toBe("Dados do Stur até 18/11, 09h30. Uma reserva criada depois disso ainda não aparece aqui.");
  expect(textoDadosAteSemVendas(periodo, "2026-11-18T09:30:00")).toBe(
    "Dados do Stur até 18/11, 09h30. Uma venda emitida depois disso ainda não aparece aqui.",
  );
});

test("nenhuma venda só pelo número, com o texto como veio", () => {
  expect(textoSemVendasNumero("9000x")).toBe(
    "Nenhuma venda com o número de reserva 9000x. Verifique o número no Stur e consulte de novo.",
  );
  expect(textoSemVendasNumero("90000099")).toBe(
    textoSemVendas({ ...CONSULTA_VAZIA, reserva: 90000099 }),
  );
});

test("período depois da cópia propõe os mesmos dias terminando nela", () => {
  const p = periodoAteCopia({ ...periodo, de: "2026-11-19" }, "2026-11-18T09:30:00");
  expect(p).toEqual({ de: "2026-11-13", ate: "2026-11-18", dias: 6 });
  if (p === null) throw new Error("esperava o período até a cópia");
  expect(textoPeriodoAteCopia(p)).toBe(
    "Os mesmos seis dias, terminando na data da cópia, vão de 13/11 a 18/11.",
  );
  expect(textoPeriodoAteCopia({ de: "2026-11-18", ate: "2026-11-18", dias: 1 })).toBe(
    "O mesmo dia, na data da cópia, é 18/11.",
  );
  expect(periodoAteCopia(periodo, "2026-11-18T09:30:00")).toBeNull(); // começa antes da cópia
  expect(periodoAteCopia({ ...periodo, de: "2026-11-19" }, null)).toBeNull();
});

test("13b: o botão consulta os mesmos dias até a cópia; um dia só leva só a data", () => {
  expect(rotuloConsultarAteCopia({ de: "2026-11-13", ate: "2026-11-18", dias: 6 })).toBe(
    "Consultar de 13/11 a 18/11",
  );
  expect(rotuloConsultarAteCopia({ de: "2026-11-18", ate: "2026-11-18", dias: 1 })).toBe(
    "Consultar 18/11",
  );
});

test("13b que atravessa o ano: o texto e o botão levam o ano dos dois lados, como o título", () => {
  const p = periodoAteCopia(
    { ...CONSULTA_VAZIA, de: "2027-01-05", ate: "2027-01-14" },
    "2027-01-03T09:30:00",
  );
  expect(p).toEqual({ de: "2026-12-25", ate: "2027-01-03", dias: 10 });
  if (p === null) throw new Error("esperava o período até a cópia");
  expect(textoPeriodoAteCopia(p)).toBe(
    "Os mesmos dez dias, terminando na data da cópia, vão de 25/12/2026 a 03/01/2027.",
  );
  expect(rotuloConsultarAteCopia(p)).toBe("Consultar de 25/12/2026 a 03/01/2027");
});

test("rodapé do erro", () => {
  expect(rodapeErro({ ...CONSULTA_VAZIA, reserva: 90000001 }, "22h48")).toBe(
    "A consulta foi do número 90000001, às 22h48.",
  );
  expect(rodapeErro(periodo, "22h48")).toBe(
    "A consulta foi das vendas emitidas de 17/11 a 24/11/2026, às 22h48.",
  );
});

// as quatro formas da consulta: período; número com período; número com filtro e sem período (decisão 13); só número
const numFiltro = { ...CONSULTA_VAZIA, reserva: 90000001, fornecedor: "AEREA EXEMPLO" };
const numPeriodo = { ...periodo, reserva: 90000001 };

test("títulos curtos com número", () => {
  expect(tituloCurto(numPeriodo)).toBe("Reserva 90000001, emitida de 17/11 a 24/11");
  expect(tituloCurto(numFiltro)).toBe("Reserva 90000001");
});

test("textos do número com filtro e com período", () => {
  expect(textoCarregando(numFiltro, 30)).toBe(
    "Consultando a reserva 90000001 na API do Stur. Pode levar até 30 segundos.",
  );
  expect(textoCarregando(numPeriodo, 30)).toBe(
    "Consultando a reserva 90000001, emitida de 17/11 a 24/11/2026, na API do Stur. Pode levar até 30 segundos.",
  );
  expect(textoSemVendas(numFiltro)).toBe(
    "Nenhuma venda com o número de reserva 90000001 e esses filtros. Verifique o número no Stur ou mude os filtros e consulte de novo.",
  );
  expect(textoDadosAteSemVendas(numPeriodo, "2026-11-18T09:30:00")).toBe(
    "Dados do Stur até 18/11, 09h30. Uma reserva criada depois disso ainda não aparece aqui.",
  );
  expect(textoDadosAteSemVendas(numFiltro, "2026-11-18T09:30:00")).toBe(
    "Dados do Stur até 18/11, 09h30. Uma reserva criada depois disso ainda não aparece aqui.",
  );
  expect(rodapeErro(numFiltro, "22h48")).toBe("A consulta foi do número 90000001, às 22h48.");
  expect(rodapeErro(numPeriodo, "22h48")).toBe(
    "A consulta foi do número 90000001, emitida de 17/11 a 24/11/2026, às 22h48.",
  );
  expect(periodoAteCopia({ ...numPeriodo, de: "2026-11-19" }, "2026-11-18T09:30:00")).toBeNull(); // a 13b é só da consulta por período sem número
});

test("nenhuma venda com filtros da consulta", () => {
  const comFiltro = { ...periodo, situacao: ["reservada"] as Situacao[], fornecedor: "AEREA EXEMPLO" };
  expect(textoSemVendas(comFiltro)).toBe(
    "A API do Stur não devolveu nenhuma venda emitida de 17/11 a 24/11/2026 com esses filtros. Verifique as datas e os filtros e consulte de novo.",
  );
  expect(textoSemVendas({ ...comFiltro, reserva: 90000099 })).toBe(
    "Nenhuma venda com o número de reserva 90000099 nesse período e com esses filtros. Verifique o número no Stur ou mude o período ou os filtros e consulte de novo.",
  );
  expect(textoDadosAteSemVendas(periodo, null)).toBeNull();
});

test("a 13b só vale quando o período começa depois do dia da cópia", () =>
  expect(periodoAteCopia({ ...periodo, de: "2026-11-18" }, "2026-11-18T09:30:00")).toBeNull());
