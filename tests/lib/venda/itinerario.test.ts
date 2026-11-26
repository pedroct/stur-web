import type { Itinerario, TrechoAgi } from "@/contrato/tipos";
import {
  caminhosEmTela,
  esperaEmTexto,
  estadiaEmTexto,
  fraseDoItinerario,
  momentoDoTrecho,
  primeiroLocalizador,
} from "@/lib/venda/itinerario";
import { trecho } from "../../fabrica";

function local(cidade: string, sigla: string, aeroporto: string | null = null) {
  return { cidade, sigla, aeroporto, pais: null, fusoHorario: null };
}

const FORTALEZA = local("Fortaleza", "FOR", "Pinto Martins");
const ROMA = local("Roma", "FCO", "Fiumicino");
const RIO = local("Rio de Janeiro", "GIG", "Galeão");
const FOZ = local("Foz do Iguaçu", "IGU", "Inter. das Cataratas");

function iti(forma: Itinerario["forma"], trajetos: number[][], extra?: Partial<Itinerario>) {
  return {
    forma,
    trajetos: trajetos.map((trechos) => ({ trechos, esperas: [] })),
    estadias: [],
    ...extra,
  } satisfies Itinerario;
}

const IDA: TrechoAgi[] = [
  trecho({ origem: FORTALEZA, destino: RIO, dtPartida: "2026-11-26T09:00:00" }),
  trecho({ origem: RIO, destino: FOZ, dtPartida: "2026-11-26T15:30:00" }),
];
const IDA_E_VOLTA: TrechoAgi[] = [
  trecho({ origem: FORTALEZA, destino: ROMA, dtPartida: "2026-11-14T00:00:00" }),
  trecho({ origem: ROMA, destino: FORTALEZA, dtPartida: "2026-11-22T00:00:00" }),
];

describe("fraseDoItinerario", () => {
  test("só ida, com a rota inteira e a data", () => {
    expect(fraseDoItinerario(iti("com_horario", [[0, 1]]), IDA, null)).toBe(
      "Fortaleza (FOR) → Rio de Janeiro (GIG) → Foz do Iguaçu (IGU), 26/11/2026, só ida",
    );
  });

  test("ida e volta quando o último destino é a primeira origem, com o período", () => {
    expect(fraseDoItinerario(iti("so_datas", [[0], [1]]), IDA_E_VOLTA, null)).toBe(
      "Fortaleza (FOR) → Roma (FCO) → Fortaleza (FOR), 14/11 a 22/11/2026, ida e volta",
    );
  });

  test("rodoviário leva a empresa no fim", () => {
    const trechos = [
      trecho({
        origem: local("Fortaleza", "FOR"),
        destino: local("Sobral", "SOBRO"),
        dtPartida: "2026-11-08T06:42:00",
      }),
    ];
    expect(fraseDoItinerario(iti("com_horario", [[0]]), trechos, "EMPRESA EXEMPLO")).toBe(
      "Fortaleza (FOR) → Sobral (SOBRO), 08/11/2026, só ida, pela EMPRESA EXEMPLO",
    );
  });

  test("sem data nenhuma, a frase não tem data; sem cidade, fica a sigla", () => {
    const trechos = [trecho({ origem: local("Fortaleza", "FOR"), destino: { sigla: "GIG" } })];
    expect(fraseDoItinerario(iti("sem_dados", [[0]]), trechos, null)).toBe(
      "Fortaleza (FOR) → GIG, só ida",
    );
  });

  test("a data vazia do Stur não entra", () => {
    const trechos = [trecho({ origem: FORTALEZA, destino: RIO, dtPartida: "1899-12-30T00:00:00" })];
    expect(fraseDoItinerario(iti("sem_dados", [[0]]), trechos, null)).toBe(
      "Fortaleza (FOR) → Rio de Janeiro (GIG), só ida",
    );
  });
});

describe("textos do itinerário", () => {
  test("espera em horas e minutos, com a cidade do aeroporto", () => {
    const espera = { aeroporto: "GIG", aposTrecho: 0, minutos: 190 };
    expect(esperaEmTexto(espera, IDA)).toBe("Espera de 3h10 em Rio de Janeiro (GIG)");
    expect(esperaEmTexto({ ...espera, minutos: 60 }, IDA)).toBe(
      "Espera de 1h00 em Rio de Janeiro (GIG)",
    );
  });

  test("estadia no singular e no plural, com a cidade como veio", () => {
    expect(estadiaEmTexto({ aposTrajeto: 0, dias: 8, sigla: "FCO", cidade: "Roma" })).toBe(
      "8 dias em Roma",
    );
    expect(estadiaEmTexto({ aposTrajeto: 0, dias: 1, sigla: "FCO", cidade: "Roma" })).toBe(
      "1 dia em Roma",
    );
    expect(estadiaEmTexto({ aposTrajeto: 0, dias: 3, sigla: "FCO", cidade: null })).toBe(
      "3 dias em FCO",
    );
  });

  test("o localizador é o do primeiro trecho que tiver um", () => {
    expect(primeiroLocalizador([trecho(), trecho({ localizador: "LOC001" })])).toBe("LOC001");
    expect(primeiroLocalizador([trecho({ localizador: "  " })])).toBeNull();
    expect(primeiroLocalizador([])).toBeNull();
  });

  test("dia e hora do trecho, sem o ano quando é o de hoje, sem hora à meia-noite", () => {
    expect(momentoDoTrecho("2026-11-26T09:00:00", "trechos[].dtPartida", "2026-11-24")).toBe(
      "26/11 · 09h00",
    );
    expect(momentoDoTrecho("2027-02-04 15:30:00", "trechos[].dtPartida", "2026-11-24")).toBe(
      "04/02/2027 · 15h30",
    );
    expect(momentoDoTrecho("2026-11-26T00:00:00", "trechos[].dtPartida", "2026-11-24")).toBe(
      "26/11",
    );
    expect(momentoDoTrecho("1899-12-30T00:00:00", "trechos[].dtPartida", "2026-11-24")).toBeNull();
    expect(momentoDoTrecho(null, "trechos[].dtPartida", "2026-11-24")).toBeNull();
  });
});

describe("caminhosEmTela", () => {
  test("a tabela do aéreo mostra voo e classe; a do rodoviário não", () => {
    const aereo = caminhosEmTela("com_horario", false);
    const onibus = caminhosEmTela("com_horario", true);
    for (const c of ["trechos[].voo", "trechos[].classe", "trechos[].farebase"]) {
      expect(aereo.has(c)).toBe(true);
      expect(onibus.has(c)).toBe(false);
    }
    expect(onibus.has("trechos[].localizador")).toBe(true);
  });

  test("a lista de datas só mostra as datas; sem dados, só as cidades", () => {
    const datas = caminhosEmTela("so_datas", false);
    expect(datas.has("trechos[].dtPartida")).toBe(true);
    expect(datas.has("trechos[].localizador")).toBe(false);
    const nada = caminhosEmTela("sem_dados", false);
    expect(nada.has("trechos[].dtPartida")).toBe(false);
    expect(nada.has("trechos[].destino.cidade")).toBe(true);
  });
});
