import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { campoDoFormulario, FormularioConsulta } from "@/componentes/consulta/FormularioConsulta";
import { PaginaInicial } from "@/componentes/consulta/PaginaInicial";
import { temPendente } from "@/lib/armazenamento/pendentes";
import { CONSULTA_VAZIA } from "@/lib/consulta/consulta";
import { definirEndereco, roteador } from "../../navegacao";
import { renderizar } from "../../renderizar";
import { requisicoesPara } from "../../servidor";

const NUMERO = { name: "Número da reserva" } as const;

test("tela inicial: título, apoio e nada consultado", () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  expect(screen.getByRole("heading", { level: 1, name: "Consultar vendas" })).toBeVisible();
  expect(screen.getByText("Pelo número da reserva, por um período ou pelos dois.")).toBeVisible();
  expect(screen.getByRole("radio", { name: "Emissão" })).toHaveAttribute("aria-checked", "true");
  expect(requisicoesPara("/api/v1/vendas")).toBe(0);
});

test("Consultar sem nada diz o que falta e põe o foco no número", async () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(
    screen.getByText("Digite o número da reserva, escolha um período ou os dois."),
  ).toBeVisible();
  expect(screen.getByRole("textbox", NUMERO)).toHaveFocus();
  expect(screen.getByRole("textbox", NUMERO)).toHaveAttribute("aria-invalid", "true");
  expect(roteador.push).not.toHaveBeenCalled();
});

test("a mensagem do campo fica ligada a ele por aria-describedby e some ao editar", async () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  const campo = screen.getByRole("textbox", NUMERO);
  expect(campo).toHaveAccessibleDescription(
    "Digite o número da reserva, escolha um período ou os dois.",
  );
  await userEvent.type(campo, "9");
  expect(campo).not.toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByText(/Digite o número da reserva, escolha/)).toBeNull();
});

test("período de 32 dias sem número é recusado na tela, sem chamar a API (critério 12)", async () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-10-24" } });
  fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-11-24" } });
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(
    screen.getByText(
      "Sem número de reserva, o período vai até 31 dias. Diminua o período ou informe o número.",
    ),
  ).toBeVisible();
  expect(screen.getByLabelText("De")).toHaveFocus();
  expect(screen.getByLabelText("De")).toHaveAttribute("aria-invalid", "true");
  expect(roteador.push).not.toHaveBeenCalled();
  expect(requisicoesPara("/api/v1/vendas")).toBe(0);
});

test("só uma das datas: pede as duas e leva o foco à que falta", async () => {
  render(<FormularioConsulta inicial={{ ...CONSULTA_VAZIA, de: "2026-11-17" }} />);
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(screen.getByText("Preencha as duas datas do período.")).toBeVisible();
  expect(screen.getByLabelText("Até")).toHaveFocus();
});

test("atalho de período preenche De e Até no dia de Fortaleza", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-25T02:00:00Z")); // ainda 24/11 em Fortaleza
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  await userEvent.click(screen.getByRole("button", { name: "Últimos 7 dias" }));
  expect(screen.getByLabelText("De")).toHaveValue("2026-11-18");
  expect(screen.getByLabelText("Até")).toHaveValue("2026-11-24");
  await userEvent.click(screen.getByRole("button", { name: "Mês passado" }));
  expect(screen.getByLabelText("De")).toHaveValue("2026-10-01");
  expect(screen.getByLabelText("Até")).toHaveValue("2026-10-31");
});

test("o tipo de data é um grupo de opções: as setas trocam a marcada", async () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  expect(screen.getByRole("radiogroup", { name: "Tipo de data" })).toBeVisible();
  screen.getByRole("radio", { name: "Emissão" }).focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(screen.getByRole("radio", { name: "Confirmação" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(screen.getByRole("radio", { name: "Confirmação" })).toHaveFocus();
  await userEvent.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByRole("radio", { name: "Emissão" })).toHaveAttribute("aria-checked", "true");
  await userEvent.keyboard("{ArrowLeft}");
  expect(screen.getByRole("radio", { name: "Alteração" })).toHaveAttribute("aria-checked", "true");
  await userEvent.click(screen.getByRole("radio", { name: "Confirmação" }));
  expect(screen.getByRole("radio", { name: "Emissão" })).toHaveAttribute("aria-checked", "false");
});

test("só número vai para a reserva; número com filtro e período abrem o resultado", async () => {
  const { unmount } = render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  await userEvent.type(screen.getByRole("textbox", NUMERO), "90000001{Enter}");
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith("/reservas/90000001");
  expect(temPendente("/consulta?reserva=90000001")).toBe(false);
  unmount();
  roteador.push.mockClear();

  const comFiltro = render(
    <FormularioConsulta inicial={{ ...CONSULTA_VAZIA, reserva: 90000001, fornecedor: "AEREA EXEMPLO" }} />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  const chaveDoFiltro = "/consulta?reserva=90000001&fornecedor=AEREA%20EXEMPLO";
  expect(temPendente(chaveDoFiltro)).toBe(true);
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith(chaveDoFiltro);
  comFiltro.unmount();
  roteador.push.mockClear();

  render(
    <FormularioConsulta inicial={{ ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" }} />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  const chave = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24";
  expect(temPendente(chave)).toBe(true);
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith(chave);
});

test("a consulta sai com os textos aparados e os vazios como null", async () => {
  const aoConsultar = vi.fn();
  definirEndereco("/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&fornecedor=AEREA%20EXEMPLO");
  render(
    <FormularioConsulta
      inicial={{
        ...CONSULTA_VAZIA,
        de: "2026-11-17",
        ate: "2026-11-24",
        fornecedor: "  AEREA EXEMPLO ",
        cliente: "   ",
      }}
      aoConsultar={aoConsultar}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(aoConsultar).toHaveBeenCalledExactlyOnceWith({
    ...CONSULTA_VAZIA,
    de: "2026-11-17",
    ate: "2026-11-24",
    fornecedor: "AEREA EXEMPLO",
    cliente: null,
  });
});

test("com aoConsultar e a mesma chave do endereço, chama a função e não navega", async () => {
  definirEndereco("/consulta?data=emissao&de=2026-11-17&ate=2026-11-24");
  const aoConsultar = vi.fn();
  const inicial = { ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" };
  render(<FormularioConsulta inicial={inicial} aoConsultar={aoConsultar} />);
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(aoConsultar).toHaveBeenCalledExactlyOnceWith(inicial);
  expect(roteador.push).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("radio", { name: "Confirmação" }));
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  const nova = "/consulta?data=confirmacao&de=2026-11-17&ate=2026-11-24";
  expect(aoConsultar).toHaveBeenCalledTimes(1);
  expect(temPendente(nova)).toBe(true);
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith(nova);
});

test("Nova consulta pelo logo limpa o formulário que veio preenchido", async () => {
  definirEndereco("/?data=emissao&de=2026-11-17&ate=2026-11-24");
  renderizar(<PaginaInicial />);
  expect(screen.getByLabelText("De")).toHaveValue("2026-11-17");
  act(() => roteador.push("/"));
  expect(screen.getByLabelText("De")).toHaveValue("");
  expect(screen.getByLabelText("Até")).toHaveValue("");
  expect(screen.getByRole("radio", { name: "Emissão" })).toHaveAttribute("aria-checked", "true");
});

test("a página inicial mostra o formulário e não mostra o aviso do link", () => {
  definirEndereco("/?data=emissao&de=2026-11-17&ate=2026-11-24&fornecedor=AEREA%20EXEMPLO");
  renderizar(<PaginaInicial />);
  expect(screen.getByLabelText("Fornecedor")).toHaveValue("AEREA EXEMPLO");
  expect(screen.queryByRole("note")).toBeNull();
});

test("colar número com pontos mantém só os dígitos; letras somem", async () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  const campo = screen.getByRole("textbox", NUMERO);
  await userEvent.click(campo);
  await userEvent.paste("9.000.000-1");
  expect(campo).toHaveValue("90000001");
  await userEvent.clear(campo);
  await userEvent.type(campo, "9000x");
  expect(campo).toHaveValue("9000");
});

test("colar texto longo com o número não corta o número antes de tirar as letras", async () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  const campo = screen.getByRole("textbox", NUMERO);
  await userEvent.click(campo);
  await userEvent.paste("Reserva 90000001");
  expect(campo).toHaveValue("90000001");
  await userEvent.keyboard("{Enter}");
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith("/reservas/90000001");
});

test("o campo de número é o que o atalho / procura", () => {
  render(<FormularioConsulta inicial={CONSULTA_VAZIA} />);
  const campo = screen.getByRole("textbox", NUMERO);
  expect(campo).toHaveAttribute("data-atalho-numero");
  expect(campo).toHaveAttribute("aria-keyshortcuts", "/");
  expect(campo).toHaveAttribute("inputmode", "numeric");
});

test("link de período mostra o aviso e o formulário preenchido (tela 1c)", () => {
  render(
    <FormularioConsulta
      inicial={{ ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24", fornecedor: "AEREA EXEMPLO" }}
      avisoLink
    />,
  );
  expect(screen.getByRole("note")).toHaveTextContent(
    "Este link trouxe uma consulta pronta, que ainda não foi feita. Verifique o período e os filtros abaixo e clique em Consultar.",
  );
  expect(screen.getByLabelText("Fornecedor")).toHaveValue("AEREA EXEMPLO");
});

test("erro do backend aponta o controle certo", () => {
  const mensagem = "Um parâmetro da consulta está num formato inválido.";
  const { unmount } = render(
    <FormularioConsulta
      inicial={{ ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24", classificacao: ["aereo"] }}
      erroInicial={{ campo: "classificacao", mensagem }}
    />,
  );
  const aviso = screen.getByText(mensagem);
  expect(aviso).toBeVisible();
  const filtros = screen
    .getByText(/Filtros \(opcionais, com número ou período\)/)
    .closest("details");
  expect(filtros?.parentElement).toContainElement(aviso);
  expect(screen.getByRole("textbox", NUMERO)).not.toHaveAttribute("aria-invalid", "true");
  unmount();

  render(
    <FormularioConsulta
      inicial={{ ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" }}
      erroInicial={{ campo: null, mensagem }}
    />,
  );
  const geral = screen.getByText(mensagem);
  const botao = screen.getByRole("button", { name: "Consultar" });
  expect(geral.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(botao.parentElement).toContainElement(geral);
});

test("erro do backend num campo marca o campo", () => {
  render(
    <FormularioConsulta
      inicial={{ ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" }}
      erroInicial={{ campo: "ate", mensagem: "A data final é anterior à inicial." }}
    />,
  );
  expect(screen.getByLabelText("Até")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Até")).toHaveAccessibleDescription(
    "A data final é anterior à inicial.",
  );
  expect(screen.getByLabelText("De")).not.toHaveAttribute("aria-invalid", "true");
});

test("campoDoFormulario leva o campo do 422 ao controle", () => {
  expect(campoDoFormulario("reserva")).toBe("reserva");
  expect(campoDoFormulario("tipoData")).toBe("tipoData");
  expect(campoDoFormulario("de")).toBe("de");
  expect(campoDoFormulario("ate")).toBe("ate");
  expect(campoDoFormulario("situacao")).toBe("situacao");
  expect(campoDoFormulario("classificacao")).toBe("produto");
  expect(campoDoFormulario("outro")).toBeNull();
  expect(campoDoFormulario(null)).toBeNull();
});

test("o limite do período vem dos parâmetros", () => {
  renderizar(<FormularioConsulta inicial={CONSULTA_VAZIA} />, {
    parametros: { periodoMaximoDias: 10 },
  });
  expect(
    screen.getByText(
      "Sem número de reserva, o período vai até 10 dias. Para achar um passageiro, consulte um período e use a busca do resultado.",
    ),
  ).toBeVisible();
});

test("linha da data da cópia só aparece com a data", () => {
  const { unmount } = renderizar(<FormularioConsulta inicial={CONSULTA_VAZIA} />, {
    parametros: { dadosDoSturAte: "2026-11-18T09:30:00" },
  });
  expect(
    screen.getByText("Dados do Stur até 18/11, 09h30. Períodos depois dessa data voltam vazios."),
  ).toBeVisible();
  unmount();
  renderizar(<FormularioConsulta inicial={CONSULTA_VAZIA} />, {
    parametros: { dadosDoSturAte: null },
  });
  expect(screen.queryByText(/Dados do Stur até/)).toBeNull();
});
