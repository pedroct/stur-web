import type { EstadoServico } from "@/contrato/tipos";
import { fraseDoEstado, textoDoEstado } from "@/lib/venda/estado";

const HOJE = "2026-11-24";

function estado(campos: Partial<EstadoServico>): EstadoServico {
  return {
    estado: "a_acontecer",
    inicio: "2026-11-26",
    fim: "2026-11-28",
    base: "trechos",
    ...campos,
  };
}

test("estado concluído de hotel", () =>
  expect(
    textoDoEstado(
      { estado: "concluido", inicio: "2026-11-20", fim: "2026-11-22", base: "entrada_saida" },
      "Hotelaria",
      "HOTEL NAC",
      "2026-11-24",
    ),
  ).toBe("Hospedagem concluída em 22/11"));

test("voo em 2 dias", () =>
  expect(textoDoEstado(estado({}), "Aéreo", "BILHETE NACIONAL", HOJE)).toBe(
    "Voo em 2 dias, 26/11",
  ));

test("seguro longe, com o ano no fim", () =>
  expect(
    textoDoEstado(
      estado({ inicio: "2027-01-09", fim: "2027-01-20", base: "inicio_termino" }),
      "Diversos",
      "SEGURO INT",
      HOJE,
    ),
  ).toBe("Seguro a acontecer, de 09/01 a 20/01/2027"));

test("amanhã, até 7 dias e mais de 7 dias", () => {
  expect(textoDoEstado(estado({ inicio: "2026-11-25" }), "Rodoviário", null, HOJE)).toBe(
    "Viagem amanhã, 25/11",
  );
  expect(textoDoEstado(estado({ inicio: "2026-12-01" }), "Hotelaria", null, HOJE)).toBe(
    "Hospedagem em 7 dias, 01/12",
  );
  expect(
    textoDoEstado(estado({ inicio: "2026-12-02", fim: "2026-12-05" }), "Locação", null, HOJE),
  ).toBe("Locação a acontecer, de 02/12 a 05/12/2026");
  expect(
    textoDoEstado(estado({ inicio: "2027-02-04", fim: "2027-02-10" }), "Pacote", null, HOJE),
  ).toBe("Pacote a acontecer, de 04/02 a 10/02/2027");
});

test("em andamento e concluído, com o gênero do substantivo", () => {
  const andamento = estado({ estado: "em_andamento", inicio: "2026-11-20", fim: "2027-01-02" });
  expect(textoDoEstado(andamento, "Aéreo", null, HOJE)).toBe("Viagem em andamento, até 02/01/2027");
  const concluido = estado({ estado: "concluido", inicio: "2026-11-10", fim: "2026-11-14" });
  expect(textoDoEstado(concluido, "Aéreo", null, HOJE)).toBe("Viagem concluída em 14/11");
  expect(textoDoEstado(concluido, "Pacote", null, HOJE)).toBe("Pacote concluído em 14/11");
  expect(textoDoEstado(concluido, "Diversos", "EVENTO", HOJE)).toBe("Evento concluído em 14/11");
  expect(textoDoEstado(concluido, "Diversos", "TAXA FEE", HOJE)).toBe("Serviço concluído em 14/11");
  expect(textoDoEstado(concluido, "Locação", null, HOJE)).toBe("Locação concluída em 14/11");
});

test("a frase de origem do selo, por base", () => {
  expect(fraseDoEstado(estado({ base: "trechos" }), "Aéreo", null)).toBe(
    "A situação da viagem vem das datas dos trechos.",
  );
  expect(fraseDoEstado(estado({ base: "entrada_saida" }), "Hotelaria", null)).toBe(
    "A situação da hospedagem vem das datas de entrada e saída.",
  );
  expect(fraseDoEstado(estado({ base: "retirada_devolucao" }), "Locação", null)).toBe(
    "A situação da locação vem das datas de retirada e devolução.",
  );
  expect(fraseDoEstado(estado({ base: "inicio_termino" }), "Diversos", "SEGURO INT")).toBe(
    "A situação do seguro vem das datas de início e término dos serviços.",
  );
  expect(fraseDoEstado(estado({ base: "inicio_termino" }), "Pacote", "PACOTE TER INT")).toBe(
    "A situação do pacote vem das datas de início e término dos serviços.",
  );
});
