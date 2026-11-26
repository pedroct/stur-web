import { expect, test } from "vitest";
import {
  CONSULTA_VAZIA,
  chaveConsulta,
  classificacaoDe,
  escreverConsulta,
  lerConsulta,
  numeroDaReserva,
  situacaoDe,
  soNumero,
  validarConsulta,
} from "@/lib/consulta/consulta";

test("endereço ida e volta, com vírgula literal", () => {
  const texto =
    "reserva=90000001&data=confirmacao&de=2026-11-01&ate=2026-11-24&situacao=reservada,cancelada&produto=aereo&fornecedor=AEREA%20EXEMPLO";
  expect(escreverConsulta(lerConsulta(new URLSearchParams(texto)))).toBe(texto);
});

test("texto com espaço e acento é codificado", () =>
  expect(
    escreverConsulta({
      ...CONSULTA_VAZIA,
      de: "2026-11-01",
      ate: "2026-11-02",
      cliente: " São Paulo ",
    }),
  ).toBe("data=emissao&de=2026-11-01&ate=2026-11-02&cliente=S%C3%A3o%20Paulo"));

test("refinamentos e paginação não entram na chave", () =>
  expect(
    chaveConsulta(
      lerConsulta(
        new URLSearchParams(
          "data=emissao&de=2026-11-17&ate=2026-11-24&f.produto=hotelaria&q=GAMA&pagina=2",
        ),
      ),
    ),
  ).toBe("/consulta?data=emissao&de=2026-11-17&ate=2026-11-24"));

test("valor inválido é ignorado e número perde o que não é dígito", () => {
  const c = lerConsulta(
    new URLSearchParams("reserva=9.000.000-1&data=xpto&situacao=reservada,roxa"),
  );
  expect(c).toMatchObject({ reserva: 90000001, tipoData: "emissao", situacao: ["reservada"] });
});

test("só número: sem período e sem filtro (decisão 13)", () => {
  expect(soNumero({ ...CONSULTA_VAZIA, reserva: 90000001 })).toBe(true);
  expect(soNumero({ ...CONSULTA_VAZIA, reserva: 90000001, fornecedor: "AEREA EXEMPLO" })).toBe(false);
  expect(
    soNumero({ ...CONSULTA_VAZIA, reserva: 90000001, de: "2026-11-01", ate: "2026-11-02" }),
  ).toBe(false);
});

test("situação e classificação da API", () => {
  expect(situacaoDe("fechada")).toBe("fechada");
  expect(situacaoDe("FECHADA")).toBe("fechada");
  expect(situacaoDe("reaberta")).toBeNull();
  expect(classificacaoDe("Aéreo")).toBe("aereo");
  expect(classificacaoDe("Hotelaria")).toBe("hotelaria");
  expect(classificacaoDe("Outra")).toBeNull();
});

test.each([
  [{}, "reserva", "Digite o número da reserva, escolha um período ou os dois."],
  [
    { fornecedor: "AEREA EXEMPLO" },
    "reserva",
    "Digite o número da reserva, escolha um período ou os dois.",
  ],
  [{ de: "2026-11-01" }, "ate", "Preencha as duas datas do período."],
  [{ ate: "2026-11-01" }, "de", "Preencha as duas datas do período."],
  [{ de: "2026-11-10", ate: "2026-11-01" }, "ate", "A data final é anterior à inicial."],
  [
    { de: "2026-10-24", ate: "2026-11-24" },
    "de",
    "Sem número de reserva, o período vai até 31 dias. Diminua o período ou informe o número.",
  ],
])("validarConsulta(%o)", (campos, campo, mensagem) =>
  expect(validarConsulta({ ...CONSULTA_VAZIA, ...campos }, 31)).toEqual({ campo, mensagem }));

test("31 dias contados com as duas pontas passam; com número, qualquer período passa", () => {
  expect(
    validarConsulta({ ...CONSULTA_VAZIA, de: "2026-10-25", ate: "2026-11-24" }, 31),
  ).toBeNull();
  expect(
    validarConsulta(
      { ...CONSULTA_VAZIA, reserva: 90000001, de: "2026-01-01", ate: "2026-11-24" },
      31,
    ),
  ).toBeNull();
});

test("numeroDaReserva", () => {
  expect(numeroDaReserva("9.000.000-1")).toBe(90000001);
  expect(numeroDaReserva(" 9000 0001 ")).toBe(90000001);
  expect(numeroDaReserva("9000x")).toBeNull();
  expect(numeroDaReserva("")).toBeNull();
  expect(numeroDaReserva("1".repeat(16))).toBeNull();
});
