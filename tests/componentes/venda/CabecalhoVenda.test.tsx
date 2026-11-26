import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Avisos } from "@/componentes/venda/Avisos";
import { CabecalhoVenda } from "@/componentes/venda/CabecalhoVenda";
import { formatarCampo } from "@/componentes/venda/GrupoDeCampos";
import { Venda } from "@/componentes/venda/Venda";
import type { VendaConsultada } from "@/contrato/tipos";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { valorDoCampo } from "@/lib/venda/campos";
import { MOLDES } from "@/lib/venda/moldes";
import { calculos, vendaAgi, vendaCheia, vendaConsultada } from "../../fabrica";

const CONSULTA = { atualizando: false, aoAtualizar: () => {}, falha: null };

/** `consultadoEm` é 24/11/2026 em Fortaleza: é o "hoje" das datas do cabeçalho. */
function hotel(campos: Partial<VendaConsultada["venda"]> = {}, estado = true): VendaConsultada {
  return vendaConsultada({
    venda: vendaAgi({ status: "CONFIRMADA", ...campos }),
    calculos: calculos({
      estadoServico: estado
        ? { estado: "concluido", inicio: "2026-11-20", fim: "2026-11-22", base: "entrada_saida" }
        : null,
    }),
  });
}

test("hotel confirmado com o estado concluído: reserva, selos, título, subtítulo e frase", () => {
  render(<CabecalhoVenda dados={hotel()} consulta={CONSULTA} />);
  expect(screen.getByText("Reserva 90000001")).toBeVisible();
  expect(screen.getByText("Confirmada no Stur")).toBeVisible();
  expect(screen.getByText("Hospedagem concluída em 22/11")).toBeVisible();
  expect(screen.getByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();
  expect(
    screen.getByText("Hotel nacional (Hotelaria) · FORNECEDOR EXEMPLO · emitida em 17/11/2026"),
  ).toBeVisible();
  expect(
    screen.getByText("A situação da hospedagem vem das datas de entrada e saída."),
  ).toBeVisible();
  expect(screen.getByText(/Consultado às/)).toBeVisible();
});

test("os selos têm ícone e palavra", () => {
  const { container } = render(<CabecalhoVenda dados={hotel()} consulta={CONSULTA} />);
  for (const texto of ["Confirmada no Stur", "Hospedagem concluída em 22/11"]) {
    const selo = screen.getByText(texto);
    expect(selo.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  }
  expect(container.querySelector('[data-anexo-secao="1"]')).not.toBeNull();
});

test("cancelada fica sem selo de estado e sem a frase dele", () => {
  render(<CabecalhoVenda dados={hotel({ status: "CANCELADA" })} consulta={CONSULTA} />);
  expect(screen.getByText("Cancelada no Stur")).toBeVisible();
  expect(screen.queryByText(/Hospedagem concluída/)).toBeNull();
  expect(screen.queryByText(/A situação da hospedagem/)).toBeNull();
});

test("sem estado do serviço, só o selo da situação", () => {
  render(<CabecalhoVenda dados={hotel({}, false)} consulta={CONSULTA} />);
  expect(screen.getByText("Confirmada no Stur")).toBeVisible();
  expect(screen.queryByText(/A situação da hospedagem/)).toBeNull();
});

test("situação desconhecida mostra a palavra do Stur", () => {
  render(<CabecalhoVenda dados={hotel({ status: "EM ANÁLISE" })} consulta={CONSULTA} />);
  expect(screen.getByText("Em análise no Stur")).toBeVisible();
});

test("sem cliente, o título é a reserva", () => {
  render(<CabecalhoVenda dados={hotel({ nomecliente: null })} consulta={CONSULTA} />);
  expect(screen.getByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
});

test("os slots das ações e a linha da consulta", async () => {
  const aoAtualizar = vi.fn();
  render(
    <CabecalhoVenda
      dados={hotel()}
      consulta={{ ...CONSULTA, aoAtualizar }}
      acaoPrincipal={<button type="button">Copiar para enviar</button>}
      acaoSecundaria={<a href="/dado-cru">Ver dado cru</a>}
    />,
  );
  expect(screen.getByRole("button", { name: "Copiar para enviar" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Ver dado cru" })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  expect(aoAtualizar).toHaveBeenCalledOnce();
});

test("a venda tem um h1 só, com o Financeiro em h2", () => {
  render(<Venda dados={hotel()} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 2, name: "Financeiro" })).toBeInTheDocument();
});

test("dentro da reserva, o título desce para h2 e o Financeiro para h3", () => {
  render(<Venda dados={hotel()} naReserva nivelBase={2} consulta={CONSULTA} />);
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  expect(screen.getByRole("heading", { level: 2, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();
  expect(screen.getByRole("heading", { level: 3, name: "Financeiro" })).toBeInTheDocument();
});

test("a venda mostra os avisos da API logo abaixo do cabeçalho", () => {
  const dados = vendaConsultada({
    venda: vendaAgi({ status: "CANCELADA", dtcancelamento: "2026-11-21T14:30:00" }),
    calculos: calculos({ avisos: [{ codigo: "venda_cancelada", siglas: [] }] }),
  });
  render(<Venda dados={dados} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
  const nota = screen.getByRole("note");
  expect(nota).toHaveTextContent("Venda cancelada em 21/11/2026, às 14h30.");
  expect(nota).toHaveTextContent("fica fora dos totais da reserva");
});

test("a venda de incentivo ainda não monta o Financeiro (Task 8)", () => {
  const dados = vendaConsultada({ calculos: calculos({ tipo: "incentivo" }) });
  render(<Venda dados={dados} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
  expect(screen.queryByRole("heading", { name: "Financeiro" })).toBeNull();
});

describe("Avisos", () => {
  test("sem avisos não renderiza nada", () => {
    const { container } = render(<Avisos lista={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("informação e neutro são notas; atenção é alerta; o link leva à outra venda", () => {
    render(
      <Avisos
        lista={[
          { tom: "atencao", texto: "Atenção aqui" },
          { tom: "info", texto: "Informação aqui", link: "/reservas/90000001/vendas/1002" },
          { tom: "neutro", texto: "Neutro aqui" },
        ]}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Atenção aqui");
    const notas = screen.getAllByRole("note");
    expect(notas).toHaveLength(2);
    expect(notas[0]).toHaveTextContent("Informação aqui");
    expect(within(notas[0] as HTMLElement).getByRole("link")).toHaveAttribute(
      "href",
      "/reservas/90000001/vendas/1002",
    );
    expect(notas[1]).toHaveTextContent("Neutro aqui");
    expect(within(notas[1] as HTMLElement).queryByRole("link")).toBeNull();
  });
});

describe("molde do cabeçalho", () => {
  test.each([
    "hotelaria",
    "aereo",
    "diversos",
    "pacote",
  ] as const)("cada campo preenchido da seção 1 aparece como o molde declara (%s)", (classificacao) => {
    const dados = vendaCheia(classificacao);
    render(<CabecalhoVenda dados={dados} consulta={CONSULTA} />);
    const secao = document.querySelector('[data-anexo-secao="1"]');
    expect(secao).not.toBeNull();
    const declarados = MOLDES.cabecalho.map((d) => d.caminho);
    const doAnexo = CAMPOS_ANEXO_B.filter(
      (c) => c.secao === 1 && c.classes.includes(classificacao),
    );
    expect(doAnexo.map((c) => c.caminho).sort()).toEqual([...declarados].sort());
    for (const declarado of MOLDES.cabecalho) {
      const campo = CAMPOS_ANEXO_B.find((c) => c.caminho === declarado.caminho);
      if (campo === undefined || declarado.naTela.tipo !== "valor") throw new Error("molde");
      const formatado = formatarCampo(campo, valorDoCampo(dados.venda, campo.caminho));
      const esperado = declarado.naTela.transformar?.(formatado) ?? formatado;
      expect(secao, declarado.caminho).toHaveTextContent(esperado);
    }
  });
});
