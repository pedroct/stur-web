import { render, screen, within } from "@testing-library/react";
import { Venda } from "@/componentes/venda/Venda";
import type { VendaConsultada } from "@/contrato/tipos";
import { fraseSemEquivalente } from "@/lib/venda/sem-equivalente";
import {
  calculos,
  lancamento,
  pagamento,
  recebimento,
  vendaAgi,
  vendaConsultada,
} from "../../fabrica";

const CONSULTA = { atualizando: false, aoAtualizar: () => {}, falha: null };

function montar(dados: VendaConsultada) {
  return render(<Venda dados={dados} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
}

function secao(container: HTMLElement, n: number): HTMLElement {
  const raiz = container.querySelector<HTMLElement>(`[data-anexo-secao="${n}"]`);
  if (raiz === null) throw new Error(`sem a seção ${n}`);
  return raiz;
}

/** O valor do par pelo rótulo (`dt` seguido do `dd`). */
function valorDoPar(raiz: HTMLElement, rotulo: string): HTMLElement {
  const dd = within(raiz).getByText(rotulo, { selector: "dt" }).nextElementSibling;
  if (!(dd instanceof HTMLElement)) throw new Error(`par sem valor: ${rotulo}`);
  return dd;
}

describe("vínculos", () => {
  const FEE = {
    idreserva: 1002,
    numero: 90000001,
    posicao: 2,
    quantidade: 2,
    produto: "TAXA FEE",
  };

  test("o fee da mesma reserva: o par com a posição e o produto, e o link para a outra venda", () => {
    const { container } = montar(
      vendaConsultada({
        venda: vendaAgi({ idreservavinculadafee: 1002 }),
        vinculos: { fee: FEE, reembolsos: [] },
      }),
    );
    const vinculos = secao(container, 7);
    expect(within(vinculos).getByRole("heading", { level: 2, name: "Vínculos" })).toBeVisible();
    const link = within(valorDoPar(vinculos, "Venda de fee vinculada")).getByRole("link", {
      name: "venda 2 de 2, TAXA FEE",
    });
    expect(link).toHaveAttribute("href", "/reservas/90000001/vendas/1002");
    // O id interno não aparece ali (IA 6.9).
    expect(vinculos).not.toHaveTextContent("1002");
  });

  test("o fee de fora da reserva: o par sem link", () => {
    const { container } = montar(
      vendaConsultada({ venda: vendaAgi({ idreservavinculadafee: 1002 }) }),
    );
    const par = valorDoPar(secao(container, 7), "Venda de fee vinculada");
    expect(par).toHaveTextContent("uma venda que não está nesta reserva");
    expect(within(par).queryByRole("link")).toBeNull();
  });

  test("sem fee, sem reembolso e sem títulos, a seção não aparece (0 é sem vínculo)", () => {
    const { container } = montar(
      vendaConsultada({ venda: vendaAgi({ idreservavinculadafee: 0 }) }),
    );
    expect(container.querySelector('[data-anexo-secao="7"]')).toBeNull();
    expect(screen.queryByRole("heading", { name: "Vínculos" })).toBeNull();
  });

  test("os pedidos de reembolso, com link quando a venda vinculada está no número", () => {
    const { container } = montar(
      vendaConsultada({
        venda: vendaAgi({
          reembolsoVinculado: [
            {
              id: 7,
              numeroSR: "SR900001",
              nomePax: "PASSAGEIRO EXEMPLO",
              idReservaVinculada: 1002,
            },
            { id: 8, numeroSR: "SR900002", nomePax: "OUTRO EXEMPLO", idReservaVinculada: 5000 },
          ],
        }),
        vinculos: {
          fee: null,
          reembolsos: [
            { id: 7, numeroSR: "SR900001", nomePax: "PASSAGEIRO EXEMPLO", venda: FEE },
            { id: 8, numeroSR: "SR900002", nomePax: "OUTRO EXEMPLO", venda: null },
          ],
        },
      }),
    );
    const vinculos = secao(container, 7);
    expect(
      within(vinculos).getByRole("link", {
        name: "Pedido de reembolso SR900001, PASSAGEIRO EXEMPLO",
      }),
    ).toHaveAttribute("href", "/reservas/90000001/vendas/1002");
    expect(within(vinculos).getByText("Pedido de reembolso SR900002, OUTRO EXEMPLO")).toBeVisible();
    expect(within(vinculos).getAllByRole("link")).toHaveLength(1);
  });

  test("os títulos a pagar e a receber pelo grupo, um bloco por título", () => {
    const { container } = montar(
      vendaConsultada({
        venda: vendaAgi({
          financeiroVinculado: {
            contasPagar: [{ id: 1, docto: "VC900001", dtemissao: "2026-11-16 00:00:00" }],
            contasReceber: [
              { id: 2, docto: "ND900001", dtemissao: "2026-11-17 00:00:00" },
              { id: 3, docto: "ND900002", dtemissao: null },
            ],
          },
        }),
      }),
    );
    const vinculos = secao(container, 7);
    expect(valorDoPar(vinculos, "Título a pagar: documento")).toHaveTextContent("VC900001");
    expect(valorDoPar(vinculos, "Título a pagar: emissão")).toHaveTextContent("16/11/2026");
    expect(
      within(vinculos)
        .getAllByText("Título a receber: documento", { selector: "dt" })
        .map((dt) => dt.nextElementSibling?.textContent),
    ).toEqual(["ND900001", "ND900002"]);
    // Os ids dos títulos são códigos: ficam em Códigos do Stur.
    expect(within(vinculos).queryByText("Título a pagar: id", { selector: "dt" })).toBeNull();
  });
});

describe("Mais detalhes da venda e Códigos do Stur", () => {
  function cheia(): VendaConsultada {
    return vendaConsultada({
      venda: vendaAgi({
        grupocliente: "GRUPO EXEMPLO",
        nomeDeptoSetorCli: "SETOR EXEMPLO",
        nomeSolicitante: "SOLICITANTE EXEMPLO",
        nomeEmissor: "EMISSOR EXEMPLO",
        nomePromotor: "PROMOTOR EXEMPLO",
        dtcriacao: "2026-11-16 20:41:00",
        dtconfirmacao: "2026-11-16 20:41:00",
        dtreabertura: "2026-11-18 08:00:00",
        idCliente: 4001,
        idproduto: 200,
        idfornec: 300,
        idfornec2: 301,
        nomearquivo: "Reserva_exemplo.json",
        tiporegistro: "R",
        recebimentos: [
          recebimento({ uniqueid: 11, forma: 1 }),
          recebimento({ uniqueid: 12, forma: 3 }),
        ],
        pagamentos: [pagamento({ uniqueid: 21, forma: 2 })],
      }),
      calculos: calculos({
        recebimentos: [lancamento(), lancamento({ indice: 1 })],
      }),
      camposDesconhecidos: ["campoNovo", "detalheItem[].outroCampo"],
    });
  }

  test("recolhidos, no fim, nessa ordem; os grupos em h3 e a nota RF-09 no fim", () => {
    const { container } = montar(cheia());
    const mais = secao(container, 8);
    const codigos = secao(container, 9);
    expect(mais.tagName).toBe("DETAILS");
    expect(mais).not.toHaveAttribute("open");
    expect(codigos.tagName).toBe("DETAILS");
    expect(codigos).not.toHaveAttribute("open");
    expect(mais.compareDocumentPosition(codigos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      within(mais).getByRole("heading", { level: 2, name: "Mais detalhes da venda" }),
    ).toBeInTheDocument();
    expect(
      within(mais)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      "Quem comprou",
      "Quem vendeu na A3",
      "Fornecedores",
      "Origem da venda",
      "Datas da venda",
    ]);
    const nota = fraseSemEquivalente([
      "identificacao",
      "servicos",
      "tarifas",
      "recebimentos",
      "pagamentos",
    ]);
    const corpo = mais.querySelector(":scope > div");
    expect(corpo?.lastElementChild?.tagName).toBe("P");
    expect(corpo?.lastElementChild).toHaveTextContent(nota);
    expect(within(codigos).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Códigos do Stur · para diagnóstico",
    );
  });

  test("os pares do canvas e, com o rótulo do Anexo B, os campos que eles não usam", () => {
    const { container } = montar(cheia());
    const mais = secao(container, 8);
    expect(valorDoPar(mais, "Cliente e grupo")).toHaveTextContent(
      "CLIENTE EXEMPLO LTDA · GRUPO EXEMPLO",
    );
    expect(valorDoPar(mais, "Setor")).toHaveTextContent("SETOR EXEMPLO");
    expect(valorDoPar(mais, "Criada e confirmada")).toHaveTextContent("16/11/2026 · 20h41");
    expect(valorDoPar(mais, "Reaberta em")).toHaveTextContent("18/11/2026 · 08h00");
    // O setor vem depois dos pares do grupo "Quem comprou", antes do "Quem vendeu na A3".
    const setor = within(mais).getByText("Setor", { selector: "dt" });
    const quemVendeu = within(mais).getByRole("heading", { name: "Quem vendeu na A3" });
    expect(
      setor.compareDocumentPosition(quemVendeu) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("Códigos do Stur: os pares do canvas, o resto pelo Anexo B e um par por item de lista", () => {
    const { container } = montar(cheia());
    const codigos = secao(container, 9);
    expect(valorDoPar(codigos, "Id interno da venda")).toHaveTextContent("1001");
    expect(valorDoPar(codigos, "Cliente, produto e fornecedores")).toHaveTextContent(
      "4001 · 200 · 300 e 301",
    );
    expect(valorDoPar(codigos, "Arquivo de importação")).toHaveTextContent("Reserva_exemplo.json");
    expect(valorDoPar(codigos, "Tipo de registro")).toHaveTextContent("R");
    expect(valorDoPar(codigos, "Id do recebimento, recebimento 1")).toHaveTextContent("11");
    expect(valorDoPar(codigos, "Id do recebimento, recebimento 2")).toHaveTextContent("12");
    expect(valorDoPar(codigos, "Código da forma, recebimento 2")).toHaveTextContent("3");
    expect(valorDoPar(codigos, "Código da forma, pagamento 1")).toHaveTextContent("2");
    // Os campos que os pares do canvas usam não se repetem.
    expect(within(codigos).queryByText("Id do cliente", { selector: "dt" })).toBeNull();
    expect(within(codigos).queryByText("Arquivo de origem", { selector: "dt" })).toBeNull();
  });

  test("os campos novos da API entram em Códigos do Stur, com os caminhos (decisão 9)", () => {
    const { container } = montar(cheia());
    expect(valorDoPar(secao(container, 9), "Campos novos da API")).toHaveTextContent(
      "campoNovo, detalheItem[].outroCampo",
    );
    const { container: sem } = montar(vendaConsultada());
    expect(within(secao(sem, 9)).queryByText("Campos novos da API")).toBeNull();
  });
});

describe("recebimentos e pagamentos em tabela", () => {
  function comTres(): VendaConsultada {
    return vendaConsultada({
      venda: vendaAgi({
        recebimentos: [
          recebimento({ descricaoForma: "Faturado", nomePagante: "PAGANTE EXEMPLO" }),
          recebimento({ descricaoForma: "Cash", valor: "200.00" }),
          recebimento({ descricaoForma: "Pix", valor: "300.00" }),
        ],
        pagamentos: [
          pagamento({ descricaoForma: "Faturado" }),
          pagamento({
            descricaoForma: "Crédito",
            valor: "50.00",
            nomeBenificiario: "FORNECEDOR EXEMPLO",
          }),
        ],
      }),
      calculos: calculos({
        recebimentos: [
          lancamento({ documentos: [{ tipo: "recibo", numero: "RC900001" }] }),
          lancamento({ indice: 1, valorExibido: "200.00", descricaoForma: "Cash" }),
          lancamento({ indice: 2, valorExibido: "300.00", descricaoForma: "Pix" }),
        ],
        pagamentos: [
          lancamento({ valorExibido: "900.00" }),
          lancamento({
            indice: 1,
            valorExibido: "-50.00",
            ehCredito: true,
            descricaoForma: "Crédito",
            situacao: "em_aberto",
          }),
        ],
      }),
    });
  }

  function tabela(nome: string): HTMLElement {
    return screen.getByRole("table", { name: nome });
  }

  test("com até dois lançamentos em cada lado, só os cartões", () => {
    montar(vendaConsultada());
    expect(screen.queryByRole("heading", { name: "Recebimentos e pagamentos" })).toBeNull();
    expect(screen.queryByRole("table", { name: "Recebimentos do cliente" })).toBeNull();
  });

  test("com mais de dois num lado, as duas tabelas, com as colunas da IA 6.7", () => {
    const { container } = montar(comTres());
    const raiz = secao(container, 6);
    expect(
      within(raiz).getByRole("heading", { level: 2, name: "Recebimentos e pagamentos" }),
    ).toBeInTheDocument();
    for (const nome of ["Recebimentos do cliente", "Pagamentos ao fornecedor"]) {
      expect(
        within(tabela(nome))
          .getAllByRole("columnheader")
          .map((th) => th.textContent),
      ).toEqual(["Forma", "Documento", "Vencimento", "Valor (R$)", "Situação"]);
    }
    const linhas = within(tabela("Recebimentos do cliente")).getAllByRole("row").slice(1);
    const primeira = linhas[0];
    if (primeira === undefined) throw new Error("sem linha");
    expect(
      within(primeira)
        .getAllByRole("cell")
        .map((td) => td.textContent),
    ).toEqual(["Faturado", "recibo RC900001", "20/11/2026", "1.000,00", "Recebido"]);
  });

  test("o crédito do fornecedor: positivo, com a nota do sinal", () => {
    montar(comTres());
    const credito = within(tabela("Pagamentos ao fornecedor"))
      .getByText("Crédito a receber do fornecedor")
      .closest("tr");
    if (credito === null) throw new Error("sem a linha do crédito");
    expect(credito).toHaveTextContent("no Stur, aparece em pagamentos com sinal negativo");
    expect(credito).toHaveTextContent("50,00");
    expect(credito).not.toHaveTextContent("-50,00");
  });

  test("cada lançamento tem os detalhes, só na tabela, com o que a linha não mostra", () => {
    const { container } = montar(comTres());
    const raiz = secao(container, 6);
    const detalhes = within(raiz).getAllByText("Detalhes do lançamento", { selector: "summary" });
    expect(detalhes.length).toBeGreaterThanOrEqual(2);
    const pagante = within(raiz).getByText("Cliente Pagador", { selector: "dt" });
    expect(pagante.nextElementSibling).toHaveTextContent("PAGANTE EXEMPLO");
    // A forma do crédito não está na linha: vai para os detalhes, como veio.
    const forma = within(tabela("Pagamentos ao fornecedor")).getByText("Forma", { selector: "dt" });
    expect(forma.nextElementSibling).toHaveTextContent("Crédito");
    // Os cartões continuam, sem repetir os detalhes.
    const financeiro = secao(container, 2);
    expect(within(financeiro).queryByText("Detalhes do lançamento")).toBeNull();
  });

  test("um lado vazio tem a frase da IA 9.3", () => {
    const dados = comTres();
    dados.venda.pagamentos = [];
    dados.calculos.pagamentos = [];
    const { container } = montar(dados);
    expect(
      within(secao(container, 6)).getByText(
        "A API não trouxe nenhuma forma de pagamento ao fornecedor nesta venda.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("table", { name: "Pagamentos ao fornecedor" })).toBeNull();
  });
});

test("a ordem das seções é a da IA 6.1", () => {
  const { container } = montar(
    vendaConsultada({
      venda: vendaAgi({ idreservavinculadafee: 1002, nomeSolicitante: "SOLICITANTE EXEMPLO" }),
    }),
  );
  // As raízes das seções: as marcas dentro de outra (os detalhes do lançamento nos cartões, a
  // tarifa na conta) ficam de fora.
  const ordem = [...container.querySelectorAll<HTMLElement>("[data-anexo-secao]")]
    .filter((e) => !e.parentElement?.closest("[data-anexo-secao]"))
    .map((e) => Number(e.dataset.anexoSecao))
    .filter((n, i, todas) => todas.indexOf(n) === i);
  expect(ordem).toEqual([1, 2, 3, 4, 5, 7, 8, 9]);
});
