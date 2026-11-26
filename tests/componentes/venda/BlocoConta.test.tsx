import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { BlocoConta } from "@/componentes/venda/BlocoConta";
import { PainelContexto } from "@/componentes/venda/painel-contexto";
import { Venda } from "@/componentes/venda/Venda";
import type { ContaServico, ServicoAgi } from "@/contrato/tipos";
import { calculos, contaServico, servicoAgi, vendaAgi, vendaConsultada } from "../../fabrica";

const CONTEXTO = {
  abrirServico: () => {},
  abrirDadoCru: () => {},
  trocarServico: () => {},
  trocarParaDadoCru: () => {},
  fecharPainel: () => {},
  painelAberto: false,
};

function apto(campos: Record<string, unknown>) {
  return {
    idTipoApto: null,
    qtde: null,
    qtdeDiarias: null,
    tipoApartamento: null,
    vlrBalcao: null,
    vlrDiaria: null,
    vlrDiariaP: null,
    ...campos,
  };
}

const HOSPEDAGEM = servicoAgi({
  nomePaxCompleto: "Hospede Exemplo",
  siglaMoedaTarifa: "R$",
  vlrCambio: "1.0000",
  vlrTarifa: "462.00",
  vlrTarifaTotal: "924.00",
  vlrTxServico: "0.01",
  vlrComissaoEmissor: "0.00",
  vlrComissaoPromotor: "0.00",
  percComisRecebida: "13.0000",
  observacao: "Chegada depois das 22h",
  vlrTarifaCheia: "1000.00",
  apartamentos: [
    apto({
      qtde: 1,
      qtdeDiarias: 2,
      vlrDiaria: "462.00",
      vlrDiariaP: "412.00",
      vlrBalcao: "412.00",
    }),
  ],
});

const CONTA_DA_HOSPEDAGEM = contaServico({
  cliente: {
    termos: [
      { campo: "vlrTarifaTotal", valor: "924.00", efeito: "soma" },
      { campo: "vlrTxServico", valor: "0.01", efeito: "soma" },
    ],
    zerados: ["vlrTaxas", "vlrTxExt", "vlrDesconto"],
    total: "924.01",
    conversao: null,
    siglaComCambio1: null,
  },
  fornecedor: {
    termos: [
      { campo: "vlrTarifaTotalp", valor: "824.00", efeito: "soma" },
      { campo: "vlrComisRecebida", valor: "107.12", efeito: "reduz" },
    ],
    zerados: ["vlrTaxasP", "vlrTxExtP", "vlrDescontoAcordo"],
    total: "716.88",
    conversao: null,
    siglaComCambio1: null,
  },
  margem: "207.13",
  comissoesNaoApuradas: true,
});

function montarHospedagem() {
  return render(
    <BlocoConta
      contas={[CONTA_DA_HOSPEDAGEM]}
      servicos={[HOSPEDAGEM]}
      classificacao="Hotelaria"
      situacao="CONFIRMADA"
      venda={vendaAgi({ status: "CONFIRMADA", detalheItem: [HOSPEDAGEM] })}
    />,
  );
}

test("uma conta: cliente e fornecedor termo a termo, com o efeito e os totais", () => {
  const { container } = montarHospedagem();
  expect(screen.getByRole("heading", { level: 2, name: "Conta da hospedagem" })).toBeVisible();
  const cliente = screen.getByRole("heading", { level: 3, name: "Cliente" }).closest("section");
  const fornecedor = screen
    .getByRole("heading", { level: 3, name: "Fornecedor" })
    .closest("section");
  if (cliente === null || fornecedor === null) throw new Error("sem os lados da conta");
  const c = within(cliente as HTMLElement);
  expect(c.getByText("1 apto × 2 diárias × 462,00")).toBeVisible();
  expect(c.getByText("924,00")).toBeVisible();
  expect(c.getByText("Taxa de serviço")).toBeVisible();
  expect(c.getByText("soma ao total do cliente")).toBeVisible();
  expect(c.getByText("Total do cliente")).toBeVisible();
  expect(c.getByText("924,01")).toBeVisible();
  const f = within(fornecedor as HTMLElement);
  expect(f.getByText("1 apto × 2 diárias × 412,00")).toBeVisible();
  expect(f.getByText("Comissão do hotel, 13%")).toBeVisible();
  expect(f.getByText("reduz o custo do fornecedor")).toBeVisible();
  expect(f.getByText("Custo do fornecedor")).toBeVisible();
  expect(f.getByText("716,88")).toBeVisible();
  // A diária da linha é da hospedagem (seção 3 do Anexo B).
  expect(container.querySelector('[data-anexo-secao="3"]')?.textContent).toContain("462,00");
  expect(container.querySelector('[data-anexo-secao="5"]')).not.toBeNull();
});

test("a frase final junta comissões, referências e zerados, e termina nos totais", () => {
  montarHospedagem();
  expect(
    screen.getByText(
      (_, e) =>
        e?.tagName === "P" &&
        e.textContent ===
          "Comissões da equipe ainda não apuradas. Tarifa cheia informada no Stur: R$ 1.000,00, fora da conta. Diária de balcão informada: 412,00. Zerados: taxas, extras, desconto e acordo. Totais calculados pela aplicação.",
    ),
  ).toBeVisible();
});

test("o que a conta não mostra vem embaixo de cada lado, pelo grupo do Anexo B", () => {
  montarHospedagem();
  const cliente = screen.getByRole("heading", { name: "Cliente" }).closest("section");
  const c = within(cliente as HTMLElement);
  // Sem conversão, a sigla e o câmbio não entram na linha; o unitário também não.
  expect(c.getByText("Cliente: Valores em")).toBeVisible();
  expect(c.getByText("R$")).toBeVisible();
  expect(c.getByText("Cliente: x Câmbio")).toBeVisible();
  expect(c.getByText("Cliente: x Valor Unitário")).toBeVisible();
  // O percentual que entrou no rótulo e os termos não se repetem como par.
  const fornecedor = screen.getByRole("heading", { name: "Fornecedor" }).closest("section");
  expect(within(fornecedor as HTMLElement).queryByText(/Comissão Recebida/)).toBeNull();
  expect(c.queryByText("Cliente: + Taxa de Serviço")).toBeNull();
});

function servicoDoSeguro(k: number): ServicoAgi {
  return servicoAgi({ descricao: `SEGURO ${k}`, vlrComissaoEmissor: "0.00" });
}

function contaDoSeguro(k: number): ContaServico {
  return contaServico({
    indice: k,
    cliente: {
      termos: [{ campo: "vlrTarifaTotal", valor: "100.00", efeito: "soma" }],
      zerados: ["vlrTaxas", "vlrTxExt", "vlrTxServico", "vlrDesconto"],
      total: "100.00",
      conversao: null,
      siglaComCambio1: null,
    },
    fornecedor: {
      termos: [
        { campo: "vlrTarifaTotalp", valor: "100.00", efeito: "soma" },
        { campo: "vlrComisRecebida", valor: "40.00", efeito: "reduz" },
      ],
      // O serviço 1 tem fee: só os zerados em todos entram na frase.
      zerados:
        k === 1
          ? ["vlrTaxasP", "vlrTxExtP", "vlrDescontoAcordo"]
          : ["vlrTaxasP", "vlrTxExtP", "vlrDescontoAcordo", "vlrFeePagar"],
      total: "60.00",
      conversao: null,
      siglaComCambio1: null,
    },
    margem: "40.00",
  });
}

test("a conta somada de 7 serviços, com Tarifas e os zerados comuns", () => {
  const servicos = Array.from({ length: 7 }, (_, k) =>
    servicoAgi({ ...servicoDoSeguro(k), percComisRecebida: "40" }),
  );
  const contas = Array.from({ length: 7 }, (_, k) => contaDoSeguro(k));
  render(
    <BlocoConta
      contas={contas}
      servicos={servicos}
      classificacao="Diversos"
      situacao="FECHADA"
      venda={vendaAgi({ classificacaoproduto: "Diversos", detalheItem: servicos })}
    />,
  );
  expect(
    screen.getByRole("heading", { level: 2, name: "Conta da venda · soma dos 7 serviços" }),
  ).toBeVisible();
  const cliente = within(
    screen.getByRole("heading", { name: "Cliente" }).closest("section") as HTMLElement,
  );
  expect(cliente.getByText("Tarifas")).toBeVisible();
  expect(cliente.getAllByText("700,00")).toHaveLength(2);
  const fornecedor = within(
    screen.getByRole("heading", { name: "Fornecedor" }).closest("section") as HTMLElement,
  );
  expect(fornecedor.getByText("Tarifas")).toBeVisible();
  expect(fornecedor.getByText("Comissão recebida, 40%")).toBeVisible();
  expect(fornecedor.getByText("280,00")).toBeVisible();
  expect(fornecedor.getByText("420,00")).toBeVisible();
  expect(
    screen.getByText(
      (_, e) =>
        e?.tagName === "P" &&
        e.textContent ===
          "Nenhuma comissão da equipe lançada nesta venda. Zerados: taxas, extras, taxa de serviço, desconto e acordo. Totais calculados pela aplicação.",
    ),
  ).toBeVisible();
  // Na soma, os campos de cada serviço ficam no painel dele.
  expect(screen.queryByText("Cliente: x Valor Unitário")).toBeNull();
});

test("venda de hotel com um serviço mostra a pessoa e os grupos da seção 5 na página, sem painel", () => {
  const dados = vendaConsultada({
    venda: vendaAgi({
      classificacaoproduto: "Hotelaria",
      status: "CONFIRMADA",
      detalheItem: [servicoAgi({ ...HOSPEDAGEM, cpfPax: "000.000.000-00" })],
    }),
    calculos: calculos({ servicos: [CONTA_DA_HOSPEDAGEM] }),
  });
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
  expect(screen.getByRole("heading", { level: 2, name: "Conta da hospedagem" })).toBeVisible();
  // A pessoa, com os documentos recolhidos.
  expect(screen.getByText("Documentos e contato").closest("details")).not.toBeNull();
  expect(container.querySelector('[data-anexo-secao="4"]')).not.toBeNull();
  // Os grupos da seção 5, em h3: Observações e Comissões visíveis; os de referência recolhidos.
  expect(screen.getByRole("heading", { level: 3, name: "Observações" })).toBeVisible();
  expect(screen.getByText("Chegada depois das 22h")).toBeVisible();
  expect(screen.getByRole("heading", { level: 3, name: "Comissões da equipe" })).toBeVisible();
  expect(screen.getByText("Tarifas de referência").closest("details")).not.toHaveAttribute("open");
  // Sem conversão, não há "Valores na moeda original"; e não há painel nem botão de serviço.
  expect(screen.queryByText("Valores na moeda original")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("button", { name: /Serviço 1/ })).toBeNull();
});

test("dois apartamentos iguais: duas linhas, sem erro de chave", () => {
  const erro = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const igual = { qtde: 1, qtdeDiarias: 2, vlrDiaria: "462.00", vlrDiariaP: "412.00" };
    const s = servicoAgi({ apartamentos: [apto(igual), apto(igual)] });
    render(
      <BlocoConta
        contas={[contaServico()]}
        servicos={[s]}
        classificacao="Hotelaria"
        situacao="FECHADA"
        venda={vendaAgi({ detalheItem: [s] })}
      />,
    );
    expect(screen.getAllByText("1 apto × 2 diárias × 462,00")).toHaveLength(2);
    expect(screen.getAllByText("1 apto × 2 diárias × 412,00")).toHaveLength(2);
    expect(erro).not.toHaveBeenCalled();
  } finally {
    erro.mockRestore();
  }
});

function vendaEmMoeda(conta: ContaServico, servico: ServicoAgi) {
  return vendaConsultada({
    venda: vendaAgi({
      classificacaoproduto: "Pacote",
      nomeproduto: "PACOTE TER INT",
      detalheItem: [servico],
    }),
    calculos: calculos({ servicos: [conta] }),
  });
}

function montarVenda(dados: ReturnType<typeof vendaConsultada>) {
  return render(
    <PainelContexto.Provider value={CONTEXTO}>
      <Venda
        dados={dados}
        naReserva={false}
        nivelBase={1}
        consulta={{ atualizando: false, aoAtualizar: () => {}, falha: null }}
      />
    </PainelContexto.Provider>,
  );
}

const EM_EURO = servicoAgi({
  qtde: 1,
  siglaMoedaTarifa: "EUR",
  vlrCambio: "6.0300",
  dtCambio: "2026-05-24 00:00:00",
  vlrTarifaTotal: "8240.73",
  vlrTxExtMoedaOriginal: "12.00",
});

test("com conversão: a linha na moeda de origem e os valores na moeda original", () => {
  const conta = contaServico({
    cliente: {
      termos: [{ campo: "vlrTarifaTotal", valor: "49691.60", efeito: "soma" }],
      zerados: [],
      total: "49691.60",
      conversao: {
        sigla: "EUR",
        tarifaOrigem: "8240.73",
        cambio: "6.0300",
        dataCambio: "2026-05-24 00:00:00",
      },
      siglaComCambio1: null,
    },
  });
  montarVenda(vendaEmMoeda(conta, EM_EURO));
  const lado = within(
    screen.getByRole("heading", { name: "Cliente" }).closest("section") as HTMLElement,
  );
  expect(lado.getByText("Tarifa EUR 8.240,73 × câmbio 6,0300 · de 24/05/2026")).toBeVisible();
  expect(lado.getByText("49.691,60", { selector: "span:not(.font-semibold)" })).toBeVisible();
  // A sigla, o câmbio e a data já estão na linha: não viram par.
  expect(lado.queryByText("Cliente: Valores em")).toBeNull();
  expect(lado.queryByText("Cliente: x Câmbio")).toBeNull();
  expect(lado.queryByText("Cliente: data do câmbio")).toBeNull();
  expect(screen.queryByText(/contada como real/)).toBeNull();
  expect(
    screen.getByRole("heading", { level: 3, name: "Valores na moeda original" }),
  ).toBeVisible();
});

test("com câmbio 1: a frase embaixo da tarifa, sem os valores na moeda original", () => {
  const servico = servicoAgi({
    ...EM_EURO,
    siglaMoedaTarifa: "US$",
    vlrCambio: "1.0000",
  });
  const conta = contaServico({
    cliente: {
      termos: [{ campo: "vlrTarifaTotal", valor: "8240.73", efeito: "soma" }],
      zerados: [],
      total: "8240.73",
      conversao: null,
      siglaComCambio1: "US$",
    },
  });
  montarVenda(vendaEmMoeda(conta, servico));
  const lado = within(
    screen.getByRole("heading", { name: "Cliente" }).closest("section") as HTMLElement,
  );
  expect(
    lado.getByText("Marcada em US$ no Stur, com câmbio 1,0000; contada como real."),
  ).toBeVisible();
  // A data do câmbio não entra na frase: fica como par do grupo.
  expect(lado.getByText("Cliente: data do câmbio").nextElementSibling).toHaveTextContent(
    "24/05/2026",
  );
  expect(lado.queryByText("Cliente: Valores em")).toBeNull();
  expect(screen.queryByText("Valores na moeda original")).toBeNull();
});
