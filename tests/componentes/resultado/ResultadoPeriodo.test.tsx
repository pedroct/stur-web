import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultadoPeriodo } from "@/componentes/resultado/ResultadoPeriodo";
import type { LinhaResultado, ResultadoConsulta } from "@/contrato/tipos";
import { ErroDaConsulta } from "@/lib/api/cliente";
import { CONSULTA_VAZIA, type Consulta, chaveConsulta } from "@/lib/consulta/consulta";
import { linha, resultado } from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";
import { renderizar } from "../../renderizar";

const consulta: Consulta = { ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" };

const tres = [
  linha({
    numero: 90000001,
    idreserva: 1001,
    cliente: "ALFA EXEMPLO",
    totalCliente: "100.00",
    margem: "10.00",
  }),
  linha({
    numero: 90000002,
    idreserva: 1002,
    cliente: "BETA EXEMPLO",
    totalCliente: "50.00",
    margem: "5.00",
  }),
  linha({
    numero: 90000003,
    idreserva: 1003,
    cliente: "GAMA OUTRO",
    totalCliente: "30.00",
    margem: "3.00",
  }),
];

// As duas últimas não fecham.
const cinquentaEQuatro = Array.from({ length: 54 }, (_, i) =>
  linha({ numero: 90000001 + i, idreserva: 1001 + i, contaFecha: i < 52 }),
);

function montar(
  vendas: LinhaResultado[],
  {
    c = consulta,
    campos,
    atualizando = false,
    falhaAtualizar = null,
    aoAtualizar = vi.fn(),
    endereco = chaveConsulta(c),
  }: {
    c?: Consulta;
    campos?: Parameters<typeof resultado>[1];
    atualizando?: boolean;
    falhaAtualizar?: ErroDaConsulta | null;
    aoAtualizar?: () => void;
    endereco?: string;
  } = {},
) {
  definirEndereco(endereco);
  const dados: ResultadoConsulta = resultado(vendas, campos);
  renderizar(
    <ResultadoPeriodo
      consulta={c}
      resultado={dados}
      atualizando={atualizando}
      falhaAtualizar={falhaAtualizar}
      aoAtualizar={aoAtualizar}
    />,
  );
  return aoAtualizar;
}

const busca = () => screen.getByRole("textbox", { name: "Buscar no resultado" });
const resumo = () => screen.getByRole("region", { name: "Resumo do resultado" });
const linhasDaTabela = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

test("cabeçalho do resultado", () => {
  montar(tres);
  expect(
    screen.getByRole("heading", { level: 1, name: "Vendas emitidas de 17/11 a 24/11/2026" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Sem filtros na consulta · Consultado às 22h58 · Dados do Stur até 18/11, 09h30",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Caminho" })).toHaveTextContent(
    "Consulta › Vendas emitidas de 17/11 a 24/11",
  );
  expect(screen.getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
    "href",
    "/?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
  const atualizar = screen.getByRole("button", { name: "Atualizar" });
  expect(atualizar).toHaveAttribute("title", "Atualizar (u)");
  expect(atualizar).toHaveAttribute("aria-keyshortcuts", "u");
});

test("Atualizar e a tecla u chamam aoAtualizar", async () => {
  const user = userEvent.setup();
  const aoAtualizar = montar(tres);
  await user.click(screen.getByRole("button", { name: "Atualizar" }));
  await user.keyboard("u");
  expect(aoAtualizar).toHaveBeenCalledTimes(2);
  await user.type(busca(), "u");
  expect(aoAtualizar).toHaveBeenCalledTimes(2);
});

test("atualizando: tabela à vista e linha de status", () => {
  montar(tres, { atualizando: true });
  const texto =
    "Consultando as vendas emitidas de 17/11 a 24/11/2026 na API do Stur. Pode levar até 30 segundos.";
  expect(screen.getByText(texto).closest('[role="status"]')).not.toBeNull();
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancelar consulta" })).not.toBeInTheDocument();
});

test("falha ao atualizar: aviso e dados à vista (decisão 43)", async () => {
  const user = userEvent.setup();
  const aoAtualizar = montar(tres, { falhaAtualizar: new ErroDaConsulta("sem_resposta") });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Não foi possível atualizar. A API do Stur não respondeu em 30 segundos. Os dados abaixo são da consulta das 22h58.",
  );
  expect(screen.getByRole("table")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(aoAtualizar).toHaveBeenCalledTimes(1);
});

test("período que passa da cópia: a data vai no aviso, uma vez só (decisão 8)", () => {
  montar(tres, { campos: { periodoPassaDaCopia: true } });
  expect(screen.getByRole("note")).toHaveTextContent(
    "Dados do Stur até 18/11, 09h30. Vendas emitidas depois disso não aparecem neste resultado.",
  );
  expect(screen.getByText("Sem filtros na consulta · Consultado às 22h58")).toBeInTheDocument();
  expect(screen.getAllByText(/Dados do Stur até/)).toHaveLength(1);
});

test("sem a data da cópia, o cabeçalho não a cita e o aviso não aparece", () => {
  montar(tres, { campos: { dadosDoSturAte: null, periodoPassaDaCopia: true } });
  expect(screen.getByText("Sem filtros na consulta · Consultado às 22h58")).toBeInTheDocument();
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});

test("resumo: números do backend, link das que não fecham", async () => {
  const user = userEvent.setup();
  montar(cinquentaEQuatro, {
    campos: {
      resumo: {
        quantidade: 53,
        totalCliente: "195108.01",
        margem: "24719.99",
        percentualLucro: "12.67",
        naoFecham: 2,
      },
    },
  });
  expect(resumo()).toHaveTextContent("Vendas a cliente 53");
  expect(resumo()).toHaveTextContent("Total cliente R$ 195.108,01");
  expect(resumo()).toHaveTextContent("Margem R$ 24.719,99 12,67%");
  expect(resumo()).toHaveTextContent("Contas que não fecham 2");

  const botao = within(resumo()).getByRole("button", { name: "2" });
  expect(botao).toHaveAttribute("aria-pressed", "false");
  await user.click(botao);
  expect(roteador.replace).toHaveBeenLastCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&f.contas=nao-fecham",
  );
  expect(within(resumo()).getByRole("button", { name: "2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText(/^Mostrando 2 de 54 vendas · /)).toHaveTextContent(
    "Mostrando 2 de 54 vendas · Total cliente R$ 2.000,00 · Margem R$ 200,00",
  );
  expect(linhasDaTabela()).toHaveLength(2);

  await user.click(within(resumo()).getByRole("button", { name: "2" }));
  expect(roteador.replace).toHaveBeenLastCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
});

test("resumo: com tudo fechando, 0 e todas fecham, sem botão; percentual nulo some", () => {
  montar(tres, {
    campos: {
      resumo: {
        quantidade: 3,
        totalCliente: "195108.01",
        margem: "24719.99",
        percentualLucro: null,
        naoFecham: 0,
      },
    },
  });
  expect(resumo()).toHaveTextContent("Contas que não fecham 0 todas fecham");
  expect(within(resumo()).queryByRole("button")).not.toBeInTheDocument();
  expect(resumo()).toHaveTextContent("Margem R$ 24.719,99");
  expect(resumo()).not.toHaveTextContent("%");
});

test("incentivos numa linha à parte (decisão 7)", () => {
  const incentivo = linha({
    numero: 90000004,
    idreserva: 1004,
    tipo: "incentivo",
    fornecedor: "FORNECEDOR EXEMPLO",
    totalCliente: "0.00",
    margem: "1560.77",
  });
  montar([...tres, incentivo], {
    campos: {
      resumo: {
        incentivos: {
          quantidade: 1,
          valor: "1560.77",
          margemComIncentivos: "26280.76",
          percentualComIncentivos: "13.47",
        },
      },
    },
  });
  const bloco = screen.getByText("Incentivos de fornecedores").parentElement;
  expect(bloco).toHaveTextContent(
    "Incentivos de fornecedores R$ 1.560,77 em 1 venda, fornecedor FORNECEDOR EXEMPLO fora da margem e do % das vendas a cliente",
  );
  expect(screen.getByText(/^Totais sem as canceladas\./, { selector: "p" })).toHaveTextContent(
    "Totais sem as canceladas. Com o incentivo junto, a margem seria R$ 26.280,76 (13,47%). As contagens dos filtros incluem o incentivo. Uma reserva pode ter vendas fora deste período: abra a reserva para ver todas.",
  );
});

test("incentivos: percentual nulo, vários incentivos e fornecedores diferentes", () => {
  const incentivos = [
    linha({ numero: 90000004, idreserva: 1004, tipo: "incentivo", fornecedor: "UM EXEMPLO" }),
    linha({
      numero: 90000005,
      idreserva: 1005,
      tipo: "incentivo",
      fornecedor: "OPERADORA EXEMPLO",
      fornecedor2: "OUTRO EXEMPLO",
    }),
    // cancelado não conta no nome (o backend não o soma)
    linha({
      numero: 90000006,
      idreserva: 1006,
      tipo: "incentivo",
      fornecedor: "TERCEIRO EXEMPLO",
      situacao: "cancelada",
    }),
  ];
  montar([...tres, ...incentivos], {
    campos: {
      resumo: {
        incentivos: {
          quantidade: 2,
          valor: "200.00",
          margemComIncentivos: "26280.76",
          percentualComIncentivos: null,
        },
      },
    },
  });
  const bloco = screen.getByText("Incentivos de fornecedores").parentElement;
  expect(bloco).toHaveTextContent("R$ 200,00 em 2 vendas fora da margem");
  expect(bloco).not.toHaveTextContent("fornecedor ");
  expect(screen.getByText(/^Totais sem as canceladas\./, { selector: "p" })).toHaveTextContent(
    "Totais sem as canceladas. Com os incentivos juntos, a margem seria R$ 26.280,76. As contagens dos filtros incluem os incentivos. Uma reserva pode ter vendas fora deste período: abra a reserva para ver todas.",
  );
});

test("sem incentivos, nada da linha à parte; sem período, nada de reserva fora dele", () => {
  montar(tres, {
    c: { ...CONSULTA_VAZIA, reserva: 90000001, fornecedor: "AEREA EXEMPLO" },
    campos: {
      consulta: {
        reserva: 90000001,
        tipoData: "emissao",
        de: null,
        ate: null,
        situacao: [],
        classificacao: [],
        fornecedor: "AEREA EXEMPLO",
        cliente: null,
        emissor: null,
        janelaLarga: true,
      },
    },
  });
  expect(screen.queryByText("Incentivos de fornecedores")).not.toBeInTheDocument();
  expect(screen.getByText(/^Totais sem as canceladas\./, { selector: "p" })).toHaveTextContent(
    /^Totais sem as canceladas\.$/,
  );
});

test("linha com refinamento diz quantas, o total e a margem delas", () => {
  vi.useFakeTimers();
  // As colunas de fornecedor e emissor da fábrica também trazem "EXEMPLO".
  const vendas = tres.map((v) => ({ ...v, fornecedor: "OPERADORA UM", emissor: "EMISSOR UM" }));
  montar(vendas);
  expect(screen.getByText("Mostrando as 3 vendas do resultado.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();

  fireEvent.change(busca(), { target: { value: "EXEMPLO" } });
  // a busca espera 200 ms depois da última tecla
  act(() => {
    vi.advanceTimersByTime(199);
  });
  expect(roteador.replace).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  expect(roteador.replace).toHaveBeenCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&q=EXEMPLO",
  );
  expect(screen.getByText(/^Mostrando 2 de 3 vendas/)).toHaveTextContent(
    "Mostrando 2 de 3 vendas · Total cliente R$ 150,00 · Margem R$ 15,00",
  );
  expect(linhasDaTabela()).toHaveLength(2);

  // Limpar filtros zera o endereço e o campo
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(roteador.replace).toHaveBeenLastCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
  expect(busca()).toHaveValue("");
  expect(screen.getByText("Mostrando as 3 vendas do resultado.")).toBeInTheDocument();
});

test("cada tecla reinicia a espera, e só o último texto vai ao endereço", () => {
  vi.useFakeTimers();
  montar(tres);
  fireEvent.change(busca(), { target: { value: "AL" } });
  act(() => {
    vi.advanceTimersByTime(150);
  });
  fireEvent.change(busca(), { target: { value: "ALFA" } });
  act(() => {
    vi.advanceTimersByTime(150);
  });
  expect(roteador.replace).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(50);
  });
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  expect(roteador.replace).toHaveBeenCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&q=ALFA",
  );
  expect(busca()).toHaveValue("ALFA");
});

test("busca só de espaços não vai ao endereço e o campo não é zerado", () => {
  vi.useFakeTimers();
  montar(tres);
  fireEvent.change(busca(), { target: { value: "  " } });
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(roteador.replace).toHaveBeenCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
  expect(busca()).toHaveValue("  ");
});

test("voltar no histórico leva o campo ao q do endereço", () => {
  montar(tres, { endereco: `${chaveConsulta(consulta)}&q=ALFA` });
  expect(busca()).toHaveValue("ALFA");
  definirEndereco(chaveConsulta(consulta));
  expect(busca()).toHaveValue("");
});

test("sem nenhuma venda à mostra: sem tabela e sem paginação, com Limpar filtros", async () => {
  const user = userEvent.setup();
  montar(tres, { endereco: `${chaveConsulta(consulta)}&q=NINGUEM` });
  expect(busca()).toHaveValue("NINGUEM");
  expect(screen.getByText("Nenhuma venda com esses filtros.")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Por página")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(screen.getByRole("table")).toBeInTheDocument();
});

test("os refinamentos do endereço já chegam aplicados, com o quadro aberto", () => {
  montar(tres, { endereco: `${chaveConsulta(consulta)}&f.cliente=ALFA%20EXEMPLO` });
  expect(screen.getByText(/^Refinar resultado/).closest("details")).toHaveAttribute("open");
  expect(screen.getByText(/^Mostrando 1 de 3 vendas/)).toBeInTheDocument();
  expect(linhasDaTabela()).toHaveLength(1);
});

test("paginação: Por página volta à 1, as setas param nas pontas e por inválido vale o padrão", async () => {
  const user = userEvent.setup();
  montar(cinquentaEQuatro);
  expect(screen.getByText("1–20 de 54")).toBeInTheDocument();
  expect(linhasDaTabela()).toHaveLength(20);
  expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "Próxima página" }));
  expect(roteador.replace).toHaveBeenLastCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&pagina=2",
  );
  expect(screen.getByText("21–40 de 54")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled();

  await user.click(screen.getByRole("button", { name: "Próxima página" }));
  expect(screen.getByText("41–54 de 54")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled();

  await user.selectOptions(screen.getByLabelText("Por página"), "50");
  expect(roteador.replace).toHaveBeenLastCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&por=50",
  );
  expect(screen.getByText("1–50 de 54")).toBeInTheDocument();
  expect(screen.getByLabelText("Por página")).toHaveValue("50");
});

test("por fora das opções vale o padrão", () => {
  montar(cinquentaEQuatro, { endereco: `${chaveConsulta(consulta)}&por=7` });
  expect(screen.getByText("1–20 de 54")).toBeInTheDocument();
  expect(screen.getByLabelText("Por página")).toHaveValue("20");
});

test("trocar um refinamento volta à página 1", async () => {
  const user = userEvent.setup();
  montar(cinquentaEQuatro, { endereco: `${chaveConsulta(consulta)}&pagina=2` });
  expect(screen.getByText("21–40 de 54")).toBeInTheDocument();
  await user.click(within(resumo()).getByRole("button", { name: "2" }));
  expect(roteador.replace).toHaveBeenLastCalledWith(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&f.contas=nao-fecham",
  );
});
