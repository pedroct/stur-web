import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ConteudoDoProduto } from "@/componentes/venda/ConteudoDoProduto";
import { formatarCampo } from "@/componentes/venda/GrupoDeCampos";
import { Pessoa } from "@/componentes/venda/Pessoa";
import { PainelContexto } from "@/componentes/venda/painel-contexto";
import { Venda } from "@/componentes/venda/Venda";
import type {
  CalculosVenda,
  ContaServico,
  Itinerario,
  ServicoAgi,
  TrechoAgi,
  VendaAgi,
  VendaConsultada,
} from "@/contrato/tipos";
import type { Classificacao } from "@/lib/consulta/consulta";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { preenchido, valorDoCampo } from "@/lib/venda/campos";
import { caminhosEmTela } from "@/lib/venda/itinerario";
import { MOLDES } from "@/lib/venda/moldes";
import {
  calculos,
  contaServico,
  servicoAgi,
  trecho,
  vendaAgi,
  vendaCheia,
  vendaConsultada,
} from "../../fabrica";

const abrirServico = vi.fn();
const CONTEXTO = {
  abrirServico,
  abrirDadoCru: vi.fn(),
  trocarServico: vi.fn(),
  trocarParaDadoCru: vi.fn(),
  fecharPainel: vi.fn(),
  painelAberto: false,
};

function montar(dados: VendaConsultada, nivelBase: 1 | 2 = 1) {
  return render(
    <PainelContexto.Provider value={CONTEXTO}>
      <ConteudoDoProduto dados={dados} nivelBase={nivelBase} />
    </PainelContexto.Provider>,
  );
}

/** `consultadoEm` é 24/11/2026 em Fortaleza: é o "hoje" das datas dos trechos. */
function dadosDe(
  venda: Partial<VendaAgi>,
  calc: Partial<CalculosVenda> = {},
  servicos?: ServicoAgi[],
): VendaConsultada {
  const detalheItem = servicos ?? venda.detalheItem ?? [servicoAgi()];
  return vendaConsultada({
    venda: vendaAgi({ ...venda, detalheItem }),
    calculos: calculos({
      servicos: detalheItem.map((_, i) => contaServico({ indice: i })),
      ...calc,
    }),
  });
}

function local(cidade: string, sigla: string, aeroporto: string | null = null) {
  return { cidade, sigla, aeroporto, pais: null, fusoHorario: null };
}

const FORTALEZA = local("Fortaleza", "FOR", "Pinto Martins");
const ROMA = local("Roma", "FCO", "Fiumicino");
const RIO = local("Rio de Janeiro", "GIG", "Galeão");
const FOZ = local("Foz do Iguaçu", "IGU", "Inter. das Cataratas");

const VOO: TrechoAgi[] = [
  trecho({
    origem: FORTALEZA,
    destino: RIO,
    cia: "LA",
    voo: "3586",
    classe: "H",
    farebase: "BASE001",
    localizador: "LOC001",
    dtPartida: "2026-11-26T09:00:00",
    dtChegada: "2026-11-26T12:20:00",
  }),
  trecho({
    origem: RIO,
    destino: FOZ,
    cia: "LA",
    voo: "3684",
    classe: "H",
    farebase: "BASE001",
    localizador: "LOC001",
    dtPartida: "2026-11-26T15:30:00",
    dtChegada: "2026-11-26T17:40:00",
  }),
];
const ITINERARIO_DO_VOO: Itinerario = {
  forma: "com_horario",
  trajetos: [{ trechos: [0, 1], esperas: [{ aeroporto: "GIG", aposTrecho: 0, minutos: 190 }] }],
  estadias: [],
};
const AEREO = { classificacaoproduto: "Aéreo", nomeproduto: "BILHETE NACIONAL" };

function cabecalhos(): string[] {
  return screen.getAllByRole("columnheader").map((c) => c.textContent ?? "");
}

describe("Itinerário", () => {
  test("com horário: tabela com as colunas, a espera de 3h10 entre os trechos e as notas", () => {
    const { container } = montar(
      dadosDe({ ...AEREO, trechos: VOO }, { itinerario: ITINERARIO_DO_VOO }),
    );
    expect(screen.getByRole("heading", { level: 2, name: "Itinerário" })).toBeVisible();
    expect(
      screen.getByText(
        "Fortaleza (FOR) → Rio de Janeiro (GIG) → Foz do Iguaçu (IGU), 26/11/2026, só ida",
      ),
    ).toBeVisible();
    const tabela = screen.getByRole("table", { name: "Trechos do voo" });
    expect(cabecalhos()).toEqual([
      "Trecho",
      "Voo",
      "Partida",
      "Chegada",
      "Classe e base tarifária",
      "Localizador",
    ]);
    const linhas = within(tabela).getAllByRole("row");
    // cabeçalho, trecho, espera, trecho
    expect(linhas).toHaveLength(4);
    expect(linhas[1]).toHaveTextContent("FOR → GIG");
    expect(linhas[1]).toHaveTextContent("Pinto Martins → Galeão");
    expect(linhas[1]).toHaveTextContent("LA 3586");
    expect(linhas[1]).toHaveTextContent("26/11 · 09h00");
    expect(linhas[1]).toHaveTextContent("26/11 · 12h20");
    expect(linhas[1]).toHaveTextContent("H · BASE001");
    expect(linhas[1]).toHaveTextContent("LOC001");
    expect(linhas[2]).toHaveTextContent("Espera de 3h10 em Rio de Janeiro (GIG)");
    expect(linhas[3]).toHaveTextContent("GIG → IGU");
    expect(
      screen.getByText(
        "A aplicação calcula a espera pelos horários no mesmo aeroporto. Horários locais; o Stur não informa o fuso.",
      ),
    ).toBeVisible();
    expect(container.querySelector('[data-anexo-secao="3"]')).not.toBeNull();
  });

  test("só datas: lista com os dias entre os trajetos e a nota", () => {
    const trechos = [
      trecho({ origem: FORTALEZA, destino: ROMA, dtPartida: "2026-11-14T00:00:00" }),
      trecho({ origem: ROMA, destino: FORTALEZA, dtPartida: "2026-11-22T00:00:00" }),
    ];
    montar(
      dadosDe(
        { ...AEREO, trechos },
        {
          itinerario: {
            forma: "so_datas",
            trajetos: [
              { trechos: [0], esperas: [] },
              { trechos: [1], esperas: [] },
            ],
            estadias: [{ aposTrajeto: 0, dias: 8, sigla: "FCO", cidade: "Roma" }],
          },
        },
      ),
    );
    const itens = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(itens).toEqual([
      "14/11 · Fortaleza (FOR) → Roma (FCO)",
      "8 dias em Roma",
      "22/11 · Roma (FCO) → Fortaleza (FOR)",
    ]);
    expect(
      screen.getByText("O Stur informa só as datas: sem voo, classe, horário nem localizador."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("só datas: a chegada sem hora do Stur (00:00:00) sai só com a data", () => {
    const trechos = [
      trecho({
        origem: FORTALEZA,
        destino: ROMA,
        dtPartida: "2026-11-14T00:00:00",
        dtChegada: "2026-11-15T00:00:00",
      }),
    ];
    montar(
      dadosDe(
        { ...AEREO, trechos },
        {
          itinerario: {
            forma: "so_datas",
            trajetos: [{ trechos: [0], esperas: [] }],
            estadias: [],
          },
        },
      ),
    );
    for (const d of document.querySelectorAll("details")) d.open = true;
    const chegada = screen.getByText("Chegada", { selector: "dt" });
    expect(chegada.nextElementSibling).toHaveTextContent(/^15\/11\/2026$/);
    expect(document.body).not.toHaveTextContent("00h00");
  });

  test("sem dados: uma linha", () => {
    const trechos = [trecho({ origem: FORTALEZA, destino: ROMA })];
    montar(
      dadosDe(
        { ...AEREO, trechos },
        {
          itinerario: {
            forma: "sem_dados",
            trajetos: [{ trechos: [0], esperas: [] }],
            estadias: [],
          },
        },
      ),
    );
    expect(
      screen.getByText("O Stur não informa data, voo, classe nem localizador neste bilhete."),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("rodoviário: sem as colunas Voo e Classe, com a empresa na frase e os terminais", () => {
    const trechos = [
      trecho({
        origem: local("Fortaleza", "FOR", "TERMINAL A"),
        destino: local("Sobral", "SOBRO", "TERMINAL B"),
        localizador: "LOC002",
        dtPartida: "2026-11-08T06:42:00",
        dtChegada: "2026-11-08T11:57:00",
      }),
    ];
    montar(
      dadosDe(
        {
          classificacaoproduto: "Rodoviário",
          nomeproduto: "RODOVIARIO NAC",
          nomefornec: "OPERADORA EXEMPLO",
          nomefornec2: "EMPRESA EXEMPLO",
          trechos,
        },
        {
          itinerario: {
            forma: "com_horario",
            trajetos: [{ trechos: [0], esperas: [] }],
            estadias: [],
          },
        },
      ),
    );
    expect(
      screen.getByText(
        "Fortaleza (FOR) → Sobral (SOBRO), 08/11/2026, só ida, pela EMPRESA EXEMPLO",
      ),
    ).toBeVisible();
    expect(screen.getByRole("table", { name: "Trechos da passagem de ônibus" })).toBeVisible();
    expect(cabecalhos()).toEqual(["Trecho", "Partida", "Chegada", "Localizador"]);
    expect(
      screen.getByText("Fortaleza → Sobral · terminais TERMINAL A e TERMINAL B"),
    ).toBeVisible();
    expect(screen.getByText("Horários locais; o Stur não informa o fuso.")).toBeVisible();
  });

  test("sem itinerário calculado, a seção não aparece", () => {
    montar(dadosDe({ ...AEREO, trechos: [] }, { itinerario: null }));
    expect(screen.queryByRole("heading", { name: "Itinerário" })).toBeNull();
  });

  test("aparece em qualquer classificação quando há trechos", () => {
    montar(dadosDe({ trechos: VOO }, { itinerario: ITINERARIO_DO_VOO }));
    expect(screen.getByRole("heading", { name: "Itinerário" })).toBeVisible();
  });

  test("o que a tabela do rodoviário não mostra vai para o grupo", () => {
    const trechos = [
      trecho({
        origem: FORTALEZA,
        destino: ROMA,
        cia: "EMPRESA EXEMPLO",
        dtPartida: "2026-11-08T06:42:00",
      }),
    ];
    montar(
      dadosDe(
        { classificacaoproduto: "Rodoviário", trechos },
        {
          itinerario: {
            forma: "com_horario",
            trajetos: [{ trechos: [0], esperas: [] }],
            estadias: [],
          },
        },
      ),
    );
    expect(screen.getByText("Cia").nextElementSibling).toHaveTextContent("EMPRESA EXEMPLO");
  });

  test("conexão e fuso ficam num details chamado Itinerário; o visível vira par sem título", async () => {
    const trechos = VOO.map((t) => ({ ...t, status: "HK", conexao: "CONEXAO EXEMPLO" }));
    montar(dadosDe({ ...AEREO, trechos }, { itinerario: ITINERARIO_DO_VOO }));
    expect(screen.getAllByText("Status do trecho", { selector: "dt" }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    const resumo = screen.getByText("Itinerário", { selector: "summary" });
    expect(resumo.closest("details")).not.toHaveAttribute("open");
    await userEvent.click(resumo);
    expect(screen.getAllByText("Conexão", { selector: "dt" }).length).toBeGreaterThan(0);
  });

  test("o título desce um nível dentro da reserva", () => {
    montar(dadosDe({ ...AEREO, trechos: VOO }, { itinerario: ITINERARIO_DO_VOO }), 2);
    expect(screen.getByRole("heading", { level: 3, name: "Itinerário" })).toBeVisible();
  });
});

describe("Hospedagem", () => {
  const HOTEL = {
    classificacaoproduto: "Hotelaria",
    nomefornec: "HOTEL EXEMPLO",
    status: "FECHADA",
  };
  const HOSPEDE = {
    dtEntrada: "2026-11-20T00:00:00",
    dtSaida: "2026-11-22T00:00:00",
    categHotel: "CASAL",
    regime: "CAFÉ DA MANHÃ",
    acomodacoesePassageiros: "1 DBL CASAL",
    apartamentos: [{ tipoApartamento: "(DBL) - DUPLO", qtde: 1, qtdeDiarias: 2 }],
    nomePaxCompleto: "Hospede Exemplo",
    nomePax: "EXEMPLO/HOSPEDE",
    numerodeconfirmacao: "001",
    numeroVC: "VC0001",
    // Na hotelaria, a base nunca traz a quantidade do serviço (Anexo B, Itens): ela vai nos
    // apartamentos. Com ela, a página mostra o grupo "Itens" (Task 9).
    qtde: null,
  };

  test("o hotel, o período com as diárias e os pares do canvas", () => {
    montar(dadosDe(HOTEL, {}, [servicoAgi(HOSPEDE)]));
    expect(screen.getByRole("heading", { level: 2, name: "Hospedagem" })).toBeVisible();
    expect(screen.getByText("HOTEL EXEMPLO")).toBeVisible();
    expect(screen.getByText("20/11 a 22/11/2026 · 2 diárias")).toBeVisible();
    const par = (rotulo: string) => screen.getByText(rotulo).nextElementSibling;
    expect(par("Apartamento")).toHaveTextContent("(DBL) - DUPLO · categoria CASAL");
    expect(par("Regime")).toHaveTextContent("CAFÉ DA MANHÃ");
    expect(par("Acomodação")).toHaveTextContent("1 DBL CASAL");
    expect(par("Hóspede")).toHaveTextContent("Hospede Exemplo · na reserva: EXEMPLO/HOSPEDE");
    expect(par("Confirmação do hotel")).toHaveTextContent("001");
    expect(par("Voucher")).toHaveTextContent("VC0001");
  });

  test("a venda cancelada acrescenta que não vai acontecer", () => {
    montar(dadosDe({ ...HOTEL, status: "CANCELADA" }, {}, [servicoAgi(HOSPEDE)]));
    expect(screen.getByText("20/11 a 22/11/2026 · 2 diárias · não vai acontecer")).toBeVisible();
  });

  test("o campo visível que o molde não mostra vira par na seção, sem título novo", () => {
    montar(
      dadosDe(HOTEL, {}, [
        servicoAgi({ ...HOSPEDE, numeroOS: "OS0001", confirmadopor: "ATENDENTE EXEMPLO" }),
      ]),
    );
    expect(screen.getByText("Confirmado por").nextElementSibling).toHaveTextContent(
      "ATENDENTE EXEMPLO",
    );
    expect(screen.getByText("Nº da OS").nextElementSibling).toHaveTextContent("OS0001");
    // O título da seção já é o do grupo: nenhum h3 novo.
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    // O que o card mostra não se repete.
    expect(screen.getAllByText("Regime", { selector: "dt" })).toHaveLength(1);
  });

  test("o campo recolhido vai num details com o nome do grupo no Anexo B", async () => {
    montar(dadosDe(HOTEL, {}, [servicoAgi({ ...HOSPEDE, rotaProdutoFT: "ROTA EXEMPLO" })]));
    const detalhes = screen.getByText("Hospedagem", { selector: "summary" }).closest("details");
    expect(detalhes).not.toHaveAttribute("open");
    expect(screen.getByText("ROTA EXEMPLO")).not.toBeVisible();
    await userEvent.click(screen.getByText("Hospedagem", { selector: "summary" }));
    expect(screen.getByText("Rota do produto").nextElementSibling).toHaveTextContent(
      "ROTA EXEMPLO",
    );
    expect(screen.getByText("ROTA EXEMPLO")).toBeVisible();
  });

  test("com um serviço, um campo de outro grupo do serviço vem com o nome do grupo (Itens)", () => {
    montar(dadosDe(HOTEL, {}, [servicoAgi({ ...HOSPEDE, qtde: 3 })]));
    const itens = screen.getByRole("heading", { level: 2, name: "Itens" });
    expect(itens.closest('[data-anexo-secao="3"]')).not.toBeNull();
    const qtde = within(itens.closest("section") as HTMLElement).getByText("Qtde", {
      selector: "dt",
    });
    expect(qtde.nextElementSibling).toHaveTextContent("3");
    // Sem campo de outro grupo, nada a mais.
    const { container } = montar(dadosDe(HOTEL, {}, [servicoAgi(HOSPEDE)]));
    expect(within(container).queryByRole("heading", { name: "Itens" })).toBeNull();
  });

  test("com um serviço, o resto da hospedagem não repete a diária que a conta mostra", () => {
    const apartamento = {
      tipoApartamento: "(DBL) - DUPLO",
      qtde: 1,
      qtdeDiarias: 2,
      vlrDiaria: "462.00",
      vlrDiariaP: "412.00",
      vlrBalcao: "412.00",
    };
    montar(dadosDe(HOTEL, {}, [servicoAgi({ ...HOSPEDE, apartamentos: [apartamento] })]));
    // A conta mostra a diária de cada lado na linha da tarifa e a de balcão na frase.
    expect(screen.queryByText("Diária cliente")).toBeNull();
    expect(screen.queryByText("Diária fornecedor")).toBeNull();
    expect(screen.queryByText("Diária balcão")).toBeNull();
    // A quantidade de apartamentos continua como par.
    expect(screen.getByText("Qtde").nextElementSibling).toHaveTextContent("1");
  });

  test("sem a linha dos apartamentos na conta, a diária fica no resto da hospedagem", () => {
    const apartamento = { tipoApartamento: "(DBL) - DUPLO", qtde: 1, vlrDiaria: "462.00" };
    montar(dadosDe(HOTEL, {}, [servicoAgi({ ...HOSPEDE, apartamentos: [apartamento] })]));
    expect(screen.getByText("Diária cliente").nextElementSibling).toHaveTextContent("462,00");
  });

  test("com mais de um serviço, a página não mostra o resto do serviço 1 (fica no painel)", () => {
    montar(
      dadosDe(HOTEL, {}, [
        servicoAgi({
          ...HOSPEDE,
          confirmadopor: "ATENDENTE EXEMPLO",
          rotaProdutoFT: "ROTA EXEMPLO",
          apartamentos: [{ tipoApartamento: "(DBL) - DUPLO", qtde: 1, qtdeDiarias: 2 }],
        }),
        servicoAgi({ ...HOSPEDE, nomePaxCompleto: "Hospede Dois" }),
      ]),
    );
    expect(screen.queryByText("Confirmado por")).toBeNull();
    expect(screen.queryByText("ROTA EXEMPLO")).toBeNull();
    expect(screen.queryByText("Qtde", { selector: "dt" })).toBeNull();
  });

  test("com mais de um serviço, a tabela lista as pessoas e o card não traz o hóspede", () => {
    montar(
      dadosDe(HOTEL, {}, [
        servicoAgi({ ...HOSPEDE, nomePaxCompleto: "Hospede Um" }),
        servicoAgi({ ...HOSPEDE, nomePaxCompleto: "Hospede Dois", numerodeconfirmacao: "002" }),
      ]),
    );
    expect(screen.queryByText("Hóspede", { selector: "dt" })).toBeNull();
    expect(cabecalhos()).toEqual([
      "Hóspede",
      "Entrada",
      "Saída",
      "Apartamentos",
      "Nº Confirmação",
      "Cliente (R$)",
      "Custo (R$)",
      "Receita (R$)",
    ]);
    const linha = screen.getByRole("button", { name: "Serviço 2, Hospede Dois" }).closest("tr");
    expect(linha).toHaveTextContent("1 (DBL) - DUPLO");
    expect(linha).toHaveTextContent("002");
    expect(linha).toHaveTextContent("1.000,00");
  });

  test("com mais de um serviço, o card mostra o período somado e nada do serviço 1", () => {
    montar(
      dadosDe(HOTEL, {}, [
        servicoAgi({
          ...HOSPEDE,
          nomePaxCompleto: "Hospede Um",
          dtEntrada: "2026-11-10T00:00:00",
          dtSaida: "2026-11-13T00:00:00",
          numerodeconfirmacao: "CONF-UM",
          numeroVC: "VC-UM",
        }),
        servicoAgi({
          ...HOSPEDE,
          nomePaxCompleto: "Hospede Dois",
          dtEntrada: "2026-11-15T00:00:00",
          dtSaida: "2026-11-20T00:00:00",
          regime: "MEIA PENSÃO",
          numerodeconfirmacao: "CONF-DOIS",
          numeroVC: "VC-DOIS",
        }),
      ]),
    );
    const secao = screen.getByRole("heading", { level: 2, name: "Hospedagem" }).closest("section");
    if (secao === null) throw new Error("sem a seção da hospedagem");
    const card = within(secao as HTMLElement);
    expect(card.getByText("HOTEL EXEMPLO")).toBeVisible();
    // Da menor entrada à maior saída, sem as diárias de um serviço só.
    expect(card.getByText(/^10\/11 a 20\/11\/2026$/)).toBeVisible();
    for (const rotulo of [
      "Apartamento",
      "Regime",
      "Acomodação",
      "Confirmação do hotel",
      "Voucher",
    ]) {
      expect(card.queryByText(rotulo, { selector: "dt" })).toBeNull();
    }
    expect(secao).not.toHaveTextContent("VC-UM");
    // A confirmação de cada serviço fica na linha dele, na tabela.
    const tabela = screen.getByRole("table");
    expect(tabela).toHaveTextContent("CONF-UM");
    expect(tabela).toHaveTextContent("CONF-DOIS");
  });
});

describe("Veículo", () => {
  const LOCADORA = { classificacaoproduto: "Locação", nomeproduto: "CARRO NAC" };
  const CARRO = {
    veiculo: "CARRO EXEMPLO 1.0",
    dtRetirada: "2026-10-26T00:00:00",
    horaRetirada: "1899-12-30T00:00:00",
    localRetirada: "AEROPORTO",
    dtDevolucao: "2026-10-29T00:00:00",
    horaDevolucao: "1899-12-30T07:41:00",
    localDevolucao: "AEROPORTO",
    qtdeDiarias: 3,
    nomePaxCompleto: "Condutor Exemplo",
    nomePax: "EXEMPLO/CONDUTOR",
    numerodeconfirmacao: "CONF0001",
    numeroVC: "VC0002",
  };

  test("a hora vazia some, e a data do Stur com outra hora mostra só a hora", () => {
    montar(dadosDe(LOCADORA, {}, [servicoAgi(CARRO)]));
    expect(screen.getByRole("heading", { level: 2, name: "Veículo" })).toBeVisible();
    expect(screen.getByText("CARRO EXEMPLO 1.0")).toBeVisible();
    expect(screen.getByText("26/10 a 29/10/2026 · 3 diárias")).toBeVisible();
    const par = (rotulo: string) => screen.getByText(rotulo).nextElementSibling;
    expect(par("Retirada")).toHaveTextContent(/^26\/10\/2026 · AEROPORTO$/);
    expect(par("Devolução")).toHaveTextContent(/^29\/10\/2026 · 07h41 · AEROPORTO$/);
    expect(par("Condutor")).toHaveTextContent("Condutor Exemplo · na reserva: EXEMPLO/CONDUTOR");
    expect(par("Confirmação da locadora")).toHaveTextContent("CONF0001");
    expect(par("Voucher")).toHaveTextContent("VC0002");
    expect(screen.getByText("Horários locais.")).toBeVisible();
    expect(screen.queryByText(/00h00/)).toBeNull();
    expect(screen.queryByText(/—/)).toBeNull();
  });

  test("com mais de um serviço, a página não mostra o resto do veículo do serviço 1", () => {
    montar(
      dadosDe(LOCADORA, {}, [
        servicoAgi({ ...CARRO, confirmadopor: "ATENDENTE EXEMPLO" }),
        servicoAgi({ ...CARRO, nomePaxCompleto: "Condutor Dois" }),
      ]),
    );
    expect(screen.queryByText("Confirmado por")).toBeNull();
  });

  test("com mais de um serviço, o card mostra o período somado e nada do serviço 1", () => {
    montar(
      dadosDe(LOCADORA, {}, [
        servicoAgi({ ...CARRO, numerodeconfirmacao: "CONF-UM", numeroVC: "VC-UM" }),
        servicoAgi({
          ...CARRO,
          nomePaxCompleto: "Condutor Dois",
          veiculo: "CARRO EXEMPLO 2.0",
          dtRetirada: "2026-10-27T00:00:00",
          dtDevolucao: "2026-11-02T00:00:00",
          numerodeconfirmacao: "CONF-DOIS",
          numeroVC: "VC-DOIS",
        }),
      ]),
    );
    const secao = screen.getByRole("heading", { level: 2, name: "Veículo" }).closest("section");
    if (secao === null) throw new Error("sem a seção do veículo");
    const card = within(secao as HTMLElement);
    expect(card.getByText(/^26\/10 a 02\/11\/2026$/)).toBeVisible();
    for (const rotulo of ["Retirada", "Devolução", "Confirmação da locadora", "Voucher"]) {
      expect(card.queryByText(rotulo, { selector: "dt" })).toBeNull();
    }
    // O veículo é de cada serviço: fica na tabela e no painel.
    expect(card.queryByText("CARRO EXEMPLO 1.0")).toBeNull();
    expect(secao).not.toHaveTextContent("VC-UM");
  });

  test("a venda cancelada acrescenta que não vai acontecer", () => {
    montar(dadosDe({ ...LOCADORA, status: "CANCELADA" }, {}, [servicoAgi(CARRO)]));
    expect(screen.getByText(/· não vai acontecer/)).toBeVisible();
  });
});

describe("Serviços", () => {
  const DIVERSOS = { classificacaoproduto: "Diversos", nomeproduto: "SEGURO INT" };

  function sete(): VendaConsultada {
    const servicos = Array.from({ length: 7 }, (_, i) =>
      servicoAgi({
        descricao: `ITEM EXEMPLO ${i + 1}`,
        nomePaxCompleto: `PESSOA EXEMPLO ${i + 1}`,
        numeroOS: `OS000${i + 1}`,
        dtInicio: "2027-01-10T00:00:00",
        dtTermino: "2027-01-20T00:00:00",
      }),
    );
    const contas: ContaServico[] = servicos.map((_, i) => {
      const base = contaServico({ indice: i });
      return {
        ...base,
        cliente: { ...base.cliente, total: "100.00" },
        fornecedor: { ...base.fornecedor, total: "60.00" },
        margem: "40.00",
      };
    });
    return dadosDe(
      DIVERSOS,
      {
        servicos: contas,
        totaisServicos: {
          cliente: "700.00",
          fornecedor: "420.00",
          margem: "280.00",
          percentualLucro: "40.00",
        },
      },
      servicos,
    );
  }

  test("tabela de 7 serviços, com as colunas, a segunda linha e o total", () => {
    montar(sete());
    expect(screen.getByRole("heading", { level: 2, name: "Serviços" })).toBeVisible();
    expect(cabecalhos()).toEqual([
      "Dt. Início",
      "Dt. Término",
      "Descrição",
      "Qtde",
      "Cliente (R$)",
      "Custo (R$)",
      "Receita (R$)",
    ]);
    const linha = screen
      .getByRole("button", { name: "ITEM EXEMPLO 3, PESSOA EXEMPLO 3" })
      .closest("tr");
    expect(linha).toHaveTextContent("10/01/2027");
    expect(linha).toHaveTextContent("20/01/2027");
    expect(linha).toHaveTextContent("PESSOA EXEMPLO 3 · OS0003");
    expect(linha).toHaveTextContent("100,00");
    expect(linha).toHaveTextContent("60,00");
    expect(linha).toHaveTextContent("40,00");
    const rodape = screen.getByText("Total dos 7 serviços").closest("tr");
    expect(rodape).toHaveTextContent("700,00");
    expect(rodape).toHaveTextContent("420,00");
    expect(rodape).toHaveTextContent("280,00");
    expect(screen.queryByText("Total da API")).toBeNull();
  });

  test("clicar na descrição abre o painel do serviço pelo contexto", async () => {
    montar(sete());
    await userEvent.click(screen.getByRole("button", { name: "ITEM EXEMPLO 2, PESSOA EXEMPLO 2" }));
    expect(abrirServico).toHaveBeenCalledWith(1001, 2);
  });

  test("o serviço sem valor leva a frase na segunda linha", () => {
    const servicos = [
      servicoAgi({ descricao: "ITEM EXEMPLO", nomePaxCompleto: "PESSOA UM", qtde: 1 }),
      servicoAgi({
        descricao: "ITEM EXEMPLO",
        nomePaxCompleto: "PESSOA DOIS",
        numerodeconfirmacao: "CONF9",
        qtde: null,
      }),
    ];
    const zero = contaServico({ indice: 1 });
    montar(
      dadosDe(
        DIVERSOS,
        {
          servicos: [
            contaServico({ indice: 0 }),
            {
              ...zero,
              cliente: { ...zero.cliente, total: "0.00" },
              fornecedor: { ...zero.fornecedor, total: "0.00" },
              margem: "0.00",
            },
          ],
        },
        servicos,
      ),
    );
    const linha = screen.getByRole("button", { name: "ITEM EXEMPLO, PESSOA DOIS" }).closest("tr");
    expect(linha).toHaveTextContent("PESSOA DOIS · confirmação CONF9 · sem valor neste serviço");
    expect(linha).toHaveTextContent("0,00");
    expect(screen.getAllByText(/sem valor neste serviço/)).toHaveLength(1);
  });

  test("a conta que não fecha leva a linha Total da API", () => {
    const base = sete();
    montar({
      ...base,
      venda: {
        ...base.venda,
        totalCliente: "710.00",
        totalFornecedor: "420.00",
        margemLucroBruta: "290.00",
      },
      calculos: {
        ...base.calculos,
        verificacao: { ...base.calculos.verificacao, fecha: false },
      },
    });
    const linha = screen.getByText("Total da API").closest("tr");
    expect(linha).toHaveTextContent("710,00");
    expect(linha).toHaveTextContent("420,00");
    expect(linha).toHaveTextContent("290,00");
  });

  test("com um serviço só, Diversos mantém a tabela, com a descrição em texto e sem botão", () => {
    montar(
      dadosDe(DIVERSOS, {}, [
        servicoAgi({
          descricao: "ITEM EXEMPLO",
          nomePaxCompleto: "PESSOA UM",
          observacao: "Chegada tarde",
        }),
      ]),
    );
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByText("ITEM EXEMPLO")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Total do serviço")).toBeVisible();
    expect(screen.queryByText(/Total dos/)).toBeNull();
  });

  test("a observação do serviço aparece embaixo quando há uma só", () => {
    montar(
      dadosDe(DIVERSOS, {}, [
        servicoAgi({
          descricao: "ITEM UM",
          nomePaxCompleto: "PESSOA UM",
          observacao: "Chegada tarde",
        }),
        servicoAgi({ descricao: "ITEM DOIS", nomePaxCompleto: "PESSOA DOIS" }),
      ]),
    );
    expect(screen.getByText("Observação do serviço de PESSOA UM")).toBeVisible();
    expect(screen.getByText("Chegada tarde")).toBeVisible();
  });

  test("com observações em mais de um serviço, nenhuma sobe para a tabela", () => {
    montar(
      dadosDe(DIVERSOS, {}, [
        servicoAgi({ descricao: "ITEM UM", observacao: "Nota um" }),
        servicoAgi({ descricao: "ITEM DOIS", observacao: "Nota dois" }),
      ]),
    );
    expect(screen.queryByText("Nota um")).toBeNull();
  });

  test("outras classes com mais de um serviço: pessoa, tipo e bilhete, com o botão do painel", async () => {
    montar(
      dadosDe(AEREO, {}, [
        servicoAgi({
          nomePaxCompleto: "Passageiro Um",
          descricaoSiglaTipoPax: "ADULTO",
          bilhete: "0001",
        }),
        servicoAgi({}),
      ]),
    );
    expect(cabecalhos()).toEqual([
      "Passageiro",
      "Tipo",
      "Bilhete",
      "Cliente (R$)",
      "Custo (R$)",
      "Receita (R$)",
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Serviço 1, Passageiro Um" }));
    expect(abrirServico).toHaveBeenCalledWith(1001, 1);
    expect(screen.getByRole("button", { name: "Serviço 2" })).toBeVisible();
  });

  test("sem nenhum serviço, a frase do vazio", () => {
    montar(dadosDe(DIVERSOS, {}, []));
    expect(screen.getByText("A API não trouxe nenhum serviço nesta venda.")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("Pessoa", () => {
  const COM_DOCUMENTOS = servicoAgi({
    nomePaxCompleto: "Passageiro Exemplo",
    nomePax: "EXEMPLO/PASSAGEIRO",
    descricaoSiglaTipoPax: "ADULTO",
    bilhete: "0000000001",
    cpfPax: "000.000.000-00",
    matriculaFunc: "MAT001",
  });

  test("a linha da pessoa, com o localizador, e os documentos recolhidos", async () => {
    const { container } = render(
      <Pessoa
        venda={vendaAgi({ ...AEREO, detalheItem: [COM_DOCUMENTOS] })}
        indice={0}
        classificacao="Aéreo"
        localizador="LOC001"
        nivel={3}
      />,
    );
    expect(
      screen.getByText(
        "Passageiro Passageiro Exemplo, adulto · no bilhete: EXEMPLO/PASSAGEIRO · bilhete 0000000001 · localizador LOC001",
      ),
    ).toBeVisible();
    const documentos = screen.getByText("Documentos e contato").closest("details");
    expect(documentos).not.toHaveAttribute("open");
    expect(screen.getByText("000.000.000-00")).not.toBeVisible();
    await userEvent.click(screen.getByText("Documentos e contato"));
    expect(screen.getByText("000.000.000-00")).toBeVisible();
    expect(screen.getByText("Viagem corporativa").closest("details")).not.toHaveAttribute("open");
    expect(container.querySelector('[data-anexo-secao="4"]')).not.toBeNull();
  });

  test("em Diversos sem nome, não aparece nada", () => {
    const { container } = render(
      <Pessoa
        venda={vendaAgi({ classificacaoproduto: "Diversos", detalheItem: [servicoAgi()] })}
        indice={0}
        classificacao="Diversos"
        localizador={null}
        nivel={3}
      />,
    );
    expect(screen.queryByText(/Passageiro/)).toBeNull();
    expect(container).toBeVisible();
    expect(container.textContent).toBe("");
  });

  test("o segurado leva o papel pelo produto", () => {
    render(
      <Pessoa
        venda={vendaAgi({
          classificacaoproduto: "Diversos",
          nomeproduto: "SEGURO INT",
          detalheItem: [servicoAgi({ nomePaxCompleto: "Segurado Exemplo" })],
        })}
        indice={0}
        classificacao="Diversos"
        localizador={null}
        nivel={3}
      />,
    );
    expect(screen.getByText("Segurado Segurado Exemplo")).toBeVisible();
  });
});

describe("Venda", () => {
  const CONSULTA = { atualizando: false, aoAtualizar: () => {}, falha: null };

  test("com um serviço só, a página mostra o conteúdo e a pessoa, sem repetir o hóspede", () => {
    const dados = dadosDe({ classificacaoproduto: "Hotelaria", nomefornec: "HOTEL EXEMPLO" }, {}, [
      servicoAgi({ nomePaxCompleto: "Hospede Um", cpfPax: "000.000.000-00" }),
    ]);
    render(
      <PainelContexto.Provider value={CONTEXTO}>
        <Venda dados={dados} naReserva={false} nivelBase={1} consulta={CONSULTA} />
      </PainelContexto.Provider>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Hospedagem" })).toBeVisible();
    expect(screen.getAllByText(/Hospede Um/)).toHaveLength(1);
    expect(screen.getByText("Documentos e contato")).toBeVisible();
  });

  test("com mais de um serviço, a pessoa fica para o painel", () => {
    const dados = dadosDe({ ...AEREO }, {}, [
      servicoAgi({ nomePaxCompleto: "Passageiro Um", cpfPax: "000.000.000-00" }),
      servicoAgi({ nomePaxCompleto: "Passageiro Dois" }),
    ]);
    render(
      <PainelContexto.Provider value={CONTEXTO}>
        <Venda dados={dados} naReserva={false} nivelBase={1} consulta={CONSULTA} />
      </PainelContexto.Provider>,
    );
    expect(screen.queryByText("Documentos e contato")).toBeNull();
  });

  test("a venda de incentivo não monta o conteúdo do produto", () => {
    const dados = vendaConsultada({ calculos: calculos({ tipo: "incentivo" }) });
    render(<Venda dados={dados} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
    expect(screen.queryByRole("heading", { name: "Hospedagem" })).toBeNull();
  });
});

describe("cobertura dos moldes (Anexo B)", () => {
  function valores(venda: VendaAgi, caminho: string): unknown[] {
    let combinacoes: number[][] = [[]];
    let prefixo = "";
    for (const parte of caminho.split(".")) {
      prefixo = prefixo === "" ? parte : `${prefixo}.${parte}`;
      if (!parte.endsWith("[]")) continue;
      const lista = prefixo.slice(0, -2);
      combinacoes = combinacoes.flatMap((c) => {
        const itens = valorDoCampo(venda, lista, c);
        return Array.isArray(itens) ? itens.map((_, k) => [...c, k]) : [];
      });
    }
    return combinacoes
      .map((c) => valorDoCampo(venda, caminho, c))
      .filter((v) => preenchido(v, caminho));
  }

  const CLASSES: Classificacao[] = [
    "aereo",
    "rodoviario",
    "hotelaria",
    "locacao",
    "diversos",
    "pacote",
  ];
  // A conta (seção 5) também está na página, com um serviço só (decisão 22).
  const MOLDES_DA_SECAO = [
    "itinerario",
    "hospedagem",
    "veiculo",
    "servicos",
    "pessoa",
    "conta",
  ] as const;

  test.each(CLASSES)("%s: cada campo que um molde declara aparece na tela", async (classe) => {
    const dados = vendaCheia(classe);
    const { container } = render(
      <PainelContexto.Provider value={CONTEXTO}>
        <Venda
          dados={dados}
          naReserva={false}
          nivelBase={1}
          consulta={{ atualizando: false, aoAtualizar: () => {}, falha: null }}
        />
      </PainelContexto.Provider>,
    );
    const secao = (n: number) =>
      [...container.querySelectorAll(`[data-anexo-secao="${n}"]`)]
        .map((e) => e.textContent ?? "")
        .join("\n")
        .toLowerCase();
    const faltando: string[] = [];
    for (const molde of MOLDES_DA_SECAO) {
      for (const { caminho, naTela } of MOLDES[molde]) {
        const campo = CAMPOS_ANEXO_B.find((c) => c.caminho === caminho);
        if (campo === undefined || !campo.classes.includes(classe)) continue;
        const texto = secao(campo.secao);
        if (naTela.tipo === "valor") {
          for (const v of valores(dados.venda, caminho)) {
            const formatado = formatarCampo(campo, v);
            const esperado = (naTela.transformar?.(formatado) ?? formatado).toLowerCase();
            if (!texto.includes(esperado)) faltando.push(`${caminho}: ${esperado}`);
          }
        } else if (!texto.includes(naTela.texto.toLowerCase())) {
          faltando.push(`${caminho}: ${naTela.texto}`);
        }
      }
    }
    expect(faltando).toEqual([]);
  });

  test("os campos que a tabela do aéreo mostra são os que o molde declara", () => {
    const declarados = MOLDES.itinerario.map((c) => c.caminho);
    const mostrados = caminhosEmTela("com_horario", false);
    expect(declarados.filter((c) => !mostrados.has(c))).toEqual([]);
  });

  test.each(CLASSES)("%s: todo campo preenchido das seções 3, 4 e 5 tem lugar", (classe) => {
    const dados = vendaCheia(classe);
    const { container } = render(
      <PainelContexto.Provider value={CONTEXTO}>
        <Venda
          dados={dados}
          naReserva={false}
          nivelBase={1}
          consulta={{ atualizando: false, aoAtualizar: () => {}, falha: null }}
        />
      </PainelContexto.Provider>,
    );
    const declarados = new Set(MOLDES_DA_SECAO.flatMap((m) => MOLDES[m].map((c) => c.caminho)));
    const texto = [3, 4, 5]
      .flatMap((n) => [...container.querySelectorAll(`[data-anexo-secao="${n}"]`)])
      .map((e) => (e.textContent ?? "").toLowerCase())
      .join("\n");
    const faltando: string[] = [];
    for (const campo of CAMPOS_ANEXO_B) {
      if (![3, 4, 5].includes(campo.secao) || campo.conteiner || !campo.classes.includes(classe))
        continue;
      if (declarados.has(campo.caminho)) continue;
      for (const v of valores(dados.venda, campo.caminho)) {
        const esperado = formatarCampo(campo, v).toLowerCase();
        if (!texto.includes(campo.rotulo.toLowerCase()) || !texto.includes(esperado)) {
          faltando.push(`${campo.caminho}: ${campo.rotulo} / ${esperado}`);
        }
      }
    }
    expect(faltando).toEqual([]);
  });
});
