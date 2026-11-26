import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabelaResultado } from "@/componentes/resultado/TabelaResultado";
import type { LinhaResultado } from "@/contrato/tipos";
import { lerOrigem } from "@/lib/armazenamento/origem";
import { CONSULTA_VAZIA, type Consulta } from "@/lib/consulta/consulta";
import { linha, resultado } from "../../fabrica";
import { roteador } from "../../navegacao";

const consulta: Consulta = { ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" };

function montar(
  linhas: LinhaResultado[],
  {
    c = consulta,
    janelaLarga = false,
    refinadas = linhas,
    enderecoAtual = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24",
  }: {
    c?: Consulta;
    janelaLarga?: boolean;
    refinadas?: LinhaResultado[];
    enderecoAtual?: string;
  } = {},
) {
  const base = resultado(linhas);
  return render(
    <TabelaResultado
      consulta={c}
      resultado={{ ...base, consulta: { ...base.consulta, janelaLarga } }}
      linhas={linhas}
      refinadas={refinadas}
      enderecoAtual={enderecoAtual}
    />,
  );
}

function celula(numero: number, coluna: number): HTMLElement {
  const link = screen.getByRole("link", { name: new RegExp(String(numero)) });
  const trLinha = link.closest("tr");
  const encontrada = trLinha === null ? undefined : within(trLinha).getAllByRole("cell")[coluna];
  if (encontrada === undefined)
    throw new Error(`célula ${coluna} da venda ${numero} não encontrada`);
  return encontrada;
}

test("colunas, legenda e ordem pelo tipo de data", () => {
  montar([linha()]);
  expect(
    screen.getByRole("table", {
      name: "Vendas emitidas de 17/11 a 24/11/2026, da emissão mais recente para a mais antiga",
    }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
    "Reserva",
    "Produto",
    "Cliente",
    "Fornecedor",
    "Emissão ↓",
    "Situação",
    "Total cliente (R$)",
    "Margem (R$)",
    "Conta",
  ]);
  expect(screen.getByRole("columnheader", { name: "Emissão" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("tipoData confirmacao: coluna Confirmação, com a data de confirmação", () => {
  montar([linha({ dataEmissao: "2026-11-17T10:00:00", dataConfirmacao: "2026-11-20T10:00:00" })], {
    c: { ...consulta, tipoData: "confirmacao" },
  });
  expect(screen.getByRole("columnheader", { name: "Confirmação" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  expect(screen.getByRole("table")).toHaveAccessibleName(
    "Vendas confirmadas de 17/11 a 24/11/2026, da confirmação mais recente para a mais antiga",
  );
  expect(celula(90000001, 4)).toHaveTextContent("20/11");
});

test("fornecedor 2 diferente vem primeiro, com a operadora embaixo", () => {
  montar([linha({ fornecedor: "OPERADORA EXEMPLO", fornecedor2: "HOTEL EXEMPLO" })]);
  expect(screen.getByText("HOTEL EXEMPLO")).toBeInTheDocument();
  expect(screen.getByText("pela OPERADORA EXEMPLO")).toBeInTheDocument();
  expect(celula(90000001, 3)).toHaveAttribute("title", "HOTEL EXEMPLO, pela OPERADORA EXEMPLO");
});

test("fornecedor 2 igual ao 1 ou ausente mostra um nome só", () => {
  montar([
    linha({ numero: 90000001, fornecedor: "CIA EXEMPLO", fornecedor2: "CIA EXEMPLO" }),
    linha({ numero: 90000002, idreserva: 1002, fornecedor: "OUTRA EXEMPLO", fornecedor2: null }),
  ]);
  expect(screen.queryByText(/^pela /)).not.toBeInTheDocument();
  expect(celula(90000001, 3)).toHaveAttribute("title", "CIA EXEMPLO");
  expect(celula(90000002, 3)).toHaveAttribute("title", "OUTRA EXEMPLO");
});

test("mesma reserva em várias linhas, fee, incentivo, cancelada e conta", () => {
  montar([
    linha({ numero: 90000001, idreserva: 1001, vendasNoResultado: 2 }),
    linha({
      numero: 90000002,
      idreserva: 1002,
      tipo: "fee",
      fee: { idreserva: 1001, produto: "BILHETE INT" },
    }),
    linha({
      numero: 90000003,
      idreserva: 1003,
      tipo: "fee",
      fee: { idreserva: 1001, produto: null },
    }),
    linha({
      numero: 90000004,
      idreserva: 1004,
      tipo: "incentivo",
      cliente: null,
      totalCliente: "0.00",
      margem: "30.00",
    }),
    linha({ numero: 90000005, idreserva: 1005, situacao: "cancelada", contaFecha: false }),
    linha({
      numero: 90000006,
      idreserva: 1006,
      margem: "-209.58",
      dataEmissao: "1899-12-30 00:00:00",
    }),
  ]);

  expect(celula(90000001, 0)).toHaveTextContent("90000001 · 2 vendas aqui");
  expect(celula(90000002, 1)).toHaveTextContent("fee de BILHETE INT");
  expect(celula(90000003, 1)).toHaveTextContent("fee de outra venda da reserva");

  const incentivo = (coluna: number) => celula(90000004, coluna);
  expect(within(incentivo(2)).getByText("Incentivo")).toBeInTheDocument();
  expect(incentivo(2)).toHaveTextContent("sem cliente");
  expect(incentivo(2).querySelector("svg")).not.toBeNull();
  expect(incentivo(6)).toHaveTextContent("—");
  expect(incentivo(6)).toHaveTextContent("sem venda a cliente");
  expect(incentivo(7)).toHaveTextContent("30,00");
  expect(incentivo(7)).toHaveTextContent("incentivo, fora da margem");
  // fornecedor e situação do incentivo seguem como nas outras linhas
  expect(incentivo(5)).toHaveTextContent("Fechada");

  const cancelada = (coluna: number) => celula(90000005, coluna);
  expect(cancelada(5)).toHaveTextContent("Cancelada");
  expect(cancelada(8)).toHaveTextContent("Não fecha");
  expect(cancelada(8).querySelector("svg")).not.toBeNull();
  expect(celula(90000001, 8)).toBeEmptyDOMElement();

  const negativa = (coluna: number) => celula(90000006, coluna);
  expect(negativa(7)).toHaveTextContent("−209,58");
  expect(negativa(7).className).not.toMatch(/erro/);
  expect(negativa(7).querySelector("[class*=erro]")).toBeNull();
  expect(negativa(4)).toHaveTextContent("—");
});

test("data sem ano quando o período está num ano só, com os dois anos quando atravessa", () => {
  const { unmount } = montar([linha()]);
  expect(celula(90000001, 4)).toHaveTextContent(/^17\/11$/);
  unmount();

  montar([linha({ dataEmissao: "2025-12-28T10:00:00" })], {
    c: { ...consulta, de: "2025-12-28", ate: "2026-01-05" },
  });
  expect(celula(90000001, 4)).toHaveTextContent(/^28\/12\/2025$/);
});

test("número com filtro e sem período: ordem de lançamento (decisão 13)", () => {
  montar([linha({ dataEmissao: "2026-11-17T10:00:00" })], {
    c: { ...CONSULTA_VAZIA, reserva: 90000001, fornecedor: "AEREA EXEMPLO" },
    janelaLarga: true,
  });
  expect(screen.getByRole("table")).toHaveAccessibleName(
    "Reserva 90000001, na ordem de lançamento das vendas",
  );
  const emissao = screen.getByRole("columnheader", { name: "Emissão" });
  expect(emissao).toHaveTextContent(/^Emissão$/);
  expect(emissao).not.toHaveAttribute("aria-sort");
  expect(celula(90000001, 4)).toHaveTextContent(/^17\/11\/2026$/);
});

test("a linha leva à venda e registra a origem", async () => {
  const user = userEvent.setup();
  const tres = [
    linha({ numero: 90000001, idreserva: 1001, produto: "BILHETE NACIONAL" }),
    linha({ numero: 90000002, idreserva: 1002, produto: null }),
    linha({ numero: 90000003, idreserva: 1003 }),
  ];
  montar(tres.slice(0, 2), {
    refinadas: tres,
    enderecoAtual:
      "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&f.contas=nao-fecham&pagina=2",
  });

  await user.click(celula(90000001, 2)); // fora do link
  expect(roteador.push).toHaveBeenCalledTimes(1);
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001/vendas/1001");
  expect(lerOrigem()).toEqual({
    enderecoResultado:
      "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&f.contas=nao-fecham&pagina=2",
    tituloCurto: "Vendas emitidas de 17/11 a 24/11",
    vendas: [
      { numero: 90000001, idreserva: 1001, produto: "BILHETE NACIONAL" },
      { numero: 90000002, idreserva: 1002, produto: null },
      { numero: 90000003, idreserva: 1003, produto: "HOTEL NAC" },
    ],
  });

  sessionStorage.clear();
  roteador.push.mockClear();
  const link = screen.getByRole("link", { name: /90000002/ });
  expect(link).toHaveAttribute("href", "/reservas/90000002/vendas/1002");
  // Sem o roteador do Next, o Link deixa o jsdom tentar a navegação de verdade.
  const naoNavegar = (evento: Event) => evento.preventDefault();
  document.addEventListener("click", naoNavegar);
  try {
    link.focus();
    await user.keyboard("{Enter}");
  } finally {
    document.removeEventListener("click", naoNavegar);
  }
  expect(lerOrigem()?.vendas).toHaveLength(3);
  // o clique no link não passa também pela linha: nenhuma navegação em dobro
  expect(roteador.push).not.toHaveBeenCalled();

  expect(screen.queryByText(/1001/)).not.toBeInTheDocument();
  expect(screen.queryByText(/1002/)).not.toBeInTheDocument();
});
