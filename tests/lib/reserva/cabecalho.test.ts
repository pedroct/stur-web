import type { ReservaConsultada, ResumoVenda, VendaDaReserva } from "@/contrato/tipos";
import {
  fraseDasEmissoes,
  fraseDosServicos,
  selosDaReserva,
  subtituloDaReserva,
} from "@/lib/reserva/cabecalho";
import { reserva, resumoVenda } from "../../fabrica";

const HOJE = "2026-11-24";

type Extras = Partial<Omit<VendaDaReserva, "resumo" | "posicao">>;

/** A reserva da fábrica, com os campos extras de cada venda (serviço, estado, centro de custo). */
function montar(resumos: ResumoVenda[], extras: Extras[] = []): ReservaConsultada["reserva"] {
  const base = reserva(90000001, resumos).reserva;
  return {
    ...base,
    vendas: base.vendas.map((v, i) => ({ ...v, ...extras[i] })),
  };
}

function dezVendas(): ReservaConsultada["reserva"] {
  const emissoes = [
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-09T10:00:00",
    "2026-06-30T10:00:00",
    "2026-11-10T10:00:00",
  ];
  return montar(
    emissoes.map((dataEmissao, i) =>
      resumoVenda({
        idreserva: 1001 + i,
        dataEmissao,
        situacao: i === 1 ? "cancelada" : "fechada",
      }),
    ),
  );
}

describe("selosDaReserva", () => {
  test("dez vendas com uma cancelada: contagem, maior primeiro, só o primeiro leva 'no Stur'", () => {
    const selos = selosDaReserva(dezVendas(), HOJE);
    expect(selos.map((s) => s.rotulo)).toEqual(["9 fechadas no Stur", "1 cancelada"]);
    expect(selos[0]).toMatchObject({ tom: "sucesso", icone: "check" });
    expect(selos[1]).toMatchObject({ tom: "neutro-borda", icone: "x" });
  });

  test("todas com a mesma situação: 'Fechadas no Stur', sem contagem", () => {
    const r = montar([resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })]);
    expect(selosDaReserva(r, HOJE).map((s) => s.rotulo)).toEqual(["Fechadas no Stur"]);
  });

  test("a situação de maior contagem vem primeiro, mesmo sendo a última da lista", () => {
    const r = montar([
      resumoVenda({ idreserva: 1001, situacao: "reservada" }),
      resumoVenda({ idreserva: 1002 }),
      resumoVenda({ idreserva: 1003 }),
    ]);
    expect(selosDaReserva(r, HOJE).map((s) => s.rotulo)).toEqual([
      "2 fechadas no Stur",
      "1 reservada",
    ]);
  });

  test("selo de estado só quando as ativas têm a mesma classificação e o mesmo estado", () => {
    const estado = (inicio: string, fim: string) => ({
      base: "entrada_saida" as const,
      estado: "a_acontecer" as const,
      inicio,
      fim,
    });
    const r = montar(
      [
        resumoVenda({ idreserva: 1001, produto: "HOTEL NAC" }),
        resumoVenda({ idreserva: 1002, produto: "HOTEL INT" }),
        resumoVenda({ idreserva: 1003, situacao: "cancelada", classificacao: "Aéreo" }),
      ],
      [
        { estadoServico: estado("2026-12-10", "2026-12-12") },
        { estadoServico: estado("2026-12-11", "2026-12-20") },
        { estadoServico: null },
      ],
    );
    const selos = selosDaReserva(r, HOJE);
    expect(selos.at(-1)).toEqual({
      tom: "neutro",
      icone: "calendario",
      rotulo: "Hospedagem a acontecer, de 10/12 a 20/12/2026",
    });
  });

  test("sem selo de estado com classificações diferentes ou estados diferentes", () => {
    const estado = (e: "a_acontecer" | "concluido") => ({
      base: "trechos" as const,
      estado: e,
      inicio: "2026-12-10",
      fim: "2026-12-12",
    });
    const classes = montar(
      [
        resumoVenda({ idreserva: 1001, classificacao: "Aéreo" }),
        resumoVenda({ idreserva: 1002, classificacao: "Hotelaria" }),
      ],
      [{ estadoServico: estado("a_acontecer") }, { estadoServico: estado("a_acontecer") }],
    );
    expect(selosDaReserva(classes, HOJE)).toHaveLength(1);
    const estados = montar(
      [resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })],
      [{ estadoServico: estado("a_acontecer") }, { estadoServico: estado("concluido") }],
    );
    expect(selosDaReserva(estados, HOJE)).toHaveLength(1);
  });
});

describe("subtituloDaReserva", () => {
  test("passageiros distintos, classificações das ativas na ordem da tabela e centro de custo comum", () => {
    const r = montar(
      [
        resumoVenda({ idreserva: 1001, classificacao: "Diversos", passageiros: ["ANA EXEMPLO"] }),
        resumoVenda({ idreserva: 1002, classificacao: "Aéreo", passageiros: ["ANA EXEMPLO"] }),
        resumoVenda({ idreserva: 1003, classificacao: "Hotelaria", passageiros: ["BIA EXEMPLO"] }),
        resumoVenda({
          idreserva: 1004,
          classificacao: "Locação",
          situacao: "cancelada",
          passageiros: ["ANA EXEMPLO"],
        }),
      ],
      [
        { centroCusto: "CENTRO EXEMPLO" },
        { centroCusto: "CENTRO EXEMPLO" },
        { centroCusto: "CENTRO EXEMPLO" },
        { centroCusto: "CENTRO EXEMPLO" },
      ],
    );
    expect(subtituloDaReserva(r)).toBe(
      "2 passageiros · aéreo, hotelaria e diversos · centro de custo CENTRO EXEMPLO · emitidas em 17/11/2026",
    );
  });

  test("um passageiro só: a parte dos passageiros sai; centro de custo diferente também sai", () => {
    const r = montar(
      [
        resumoVenda({ idreserva: 1001, passageiros: ["ANA EXEMPLO"] }),
        resumoVenda({
          idreserva: 1002,
          passageiros: ["ANA EXEMPLO"],
          dataEmissao: "2026-11-18T10:00:00",
        }),
      ],
      [{ centroCusto: "UM" }, { centroCusto: "OUTRO" }],
    );
    expect(subtituloDaReserva(r)).toBe("hotelaria");
  });

  test("com duas datas de emissão, o subtítulo não leva a data", () => {
    const r = montar([
      resumoVenda({ idreserva: 1001 }),
      resumoVenda({ idreserva: 1002, dataEmissao: "2026-11-18T10:00:00" }),
    ]);
    expect(subtituloDaReserva(r)).not.toMatch(/emitidas/);
  });
});

describe("fraseDasEmissoes", () => {
  test("as 10 vendas, três datas", () => {
    expect(fraseDasEmissoes(dezVendas())).toBe(
      "As 10 vendas foram emitidas em três datas: 09/06, 30/06 e 10/11/2026.",
    );
  });

  test("duas datas", () => {
    const r = montar([
      resumoVenda({ idreserva: 1001, dataEmissao: "2026-06-09T10:00:00" }),
      resumoVenda({ idreserva: 1002, dataEmissao: "2026-06-30T10:00:00" }),
    ]);
    expect(fraseDasEmissoes(r)).toBe(
      "As 2 vendas foram emitidas em duas datas: 09/06 e 30/06/2026.",
    );
  });

  test("mais de três datas: de a", () => {
    const r = montar(
      ["2026-06-09", "2026-06-30", "2026-08-01", "2026-11-10"].map((d, i) =>
        resumoVenda({ idreserva: 1001 + i, dataEmissao: `${d}T10:00:00` }),
      ),
    );
    expect(fraseDasEmissoes(r)).toBe(
      "As 4 vendas foram emitidas em datas diferentes, de 09/06 a 10/11/2026.",
    );
  });

  test("uma data só: nada (o subtítulo diz)", () => {
    expect(
      fraseDasEmissoes(
        montar([resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })]),
      ),
    ).toBeNull();
  });
});

describe("fraseDosServicos", () => {
  const servico = (inicio: string | null, fim: string | null) => ({
    descricao: null,
    diarias: null,
    quantidade: 1,
    rota: [],
    inicio,
    fim,
  });

  test("o menor início e o maior fim das ativas", () => {
    const r = montar(
      [
        resumoVenda({ idreserva: 1001 }),
        resumoVenda({ idreserva: 1002 }),
        resumoVenda({ idreserva: 1003, situacao: "cancelada" }),
      ],
      [
        { servico: servico("2026-11-14", "2026-11-22") },
        { servico: servico("2026-11-16", "2026-12-02") },
        { servico: servico("2026-01-01", "2027-01-01") },
      ],
    );
    expect(fraseDosServicos(r)).toBe("Serviços de 14/11 a 02/12/2026.");
  });

  test("sem datas nos serviços: nada", () => {
    const r = montar([resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })]);
    expect(fraseDosServicos(r)).toBeNull();
  });
});
