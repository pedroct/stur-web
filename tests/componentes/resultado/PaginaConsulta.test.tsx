import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { StrictMode } from "react";
import { Moldura } from "@/componentes/moldura/Moldura";
import { PaginaConsulta } from "@/componentes/resultado/PaginaConsulta";
import { TEXTOS_ERRO } from "@/lib/api/textos-erro";
import { marcarPendente, temPendente } from "@/lib/armazenamento/pendentes";
import { lerRecentes } from "@/lib/armazenamento/recentes";
import { guardarResultado, lerResultado } from "@/lib/armazenamento/resultados";
import { erroApi, linha, resultado } from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";
import { renderizar } from "../../renderizar";
import { requisicoesPara, segurarResposta, servidor, vigiarChamada } from "../../servidor";

const endereco = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24";
const chave = endereco;

const CARREGANDO =
  "Consultando as vendas emitidas de 17/11 a 24/11/2026 na API do Stur. Pode levar até 30 segundos.";

/** Responde, na ordem, cada uma das respostas dadas; a última vale para as chamadas seguintes. */
function responderEmSequencia(...respostas: (() => Response | Promise<Response>)[]) {
  let vez = 0;
  servidor.use(
    http.get("*/api/v1/vendas", () => {
      const responder = respostas[Math.min(vez, respostas.length - 1)];
      vez += 1;
      if (!responder) throw new Error("sem resposta");
      return responder();
    }),
  );
}

/** Os rótulos dos botões e links da caixa, na ordem da tela. */
function acoes(caixa: HTMLElement): string[] {
  return [...caixa.querySelectorAll("a, button")].map((e) => e.textContent ?? "");
}

test("link de período sem pedido e sem resultado guardado: formulário 1c, sem chamar a API (critério 21)", async () => {
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  expect(await screen.findByRole("note")).toHaveTextContent("Este link trouxe uma consulta pronta");
  expect(requisicoesPara("/api/v1/vendas")).toBe(0);
});

test("com pedido: carregando 11b, depois o resultado; guarda e registra a recente", async () => {
  marcarPendente(chave);
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await delay(50);
      return HttpResponse.json(resultado([linha()]));
    }),
  );
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  expect(screen.getByRole("status")).toHaveTextContent(CARREGANDO);
  expect(screen.getByRole("navigation", { name: "Caminho" })).toHaveTextContent(
    "Consulta › Vendas emitidas de 17/11 a 24/11",
  );
  expect(await screen.findByRole("table")).toBeVisible();
  expect(lerResultado(chave)?.vendas).toHaveLength(1);
  expect(lerRecentes()[0]).toMatchObject({
    endereco: chave,
    descricao: "Vendas emitidas de 17/11 a 24/11/2026",
    detalhe: "1 venda",
  });
});

test("no modo estrito do React, uma requisição só e o resultado aparece", async () => {
  servidor.use(http.get("*/api/v1/vendas", () => HttpResponse.json(resultado([linha()]))));
  marcarPendente(chave);
  definirEndereco(endereco);
  render(
    <StrictMode>
      <PaginaConsulta />
    </StrictMode>,
  );
  expect(await screen.findByRole("table")).toBeVisible();
  expect(requisicoesPara("/api/v1/vendas")).toBe(1);
});

test("voltar ou recarregar com o resultado guardado não chama a API", async () => {
  guardarResultado(chave, resultado([linha()]));
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  expect(await screen.findByRole("table")).toBeVisible();
  expect(screen.getByText(/Consultado às 22h58/)).toBeVisible();
  expect(requisicoesPara("/api/v1/vendas")).toBe(0);
});

test("chave nova com pedido consulta de novo, sem montar a página outra vez (regra 11)", async () => {
  guardarResultado(chave, resultado([linha()]));
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  expect(await screen.findByRole("table")).toBeVisible();
  expect(requisicoesPara("/api/v1/vendas")).toBe(0);

  const outra = "/consulta?data=emissao&de=2026-11-10&ate=2026-11-16";
  const resposta = segurarResposta();
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await resposta.solta;
      return HttpResponse.json(resultado([linha(), linha({ idreserva: 1002 })]));
    }),
  );
  marcarPendente(outra);
  roteador.push(outra);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Consultando as vendas emitidas de 10/11 a 16/11/2026 na API do Stur.",
  );
  resposta.soltar();
  expect(await screen.findByRole("table")).toBeVisible();
  expect(requisicoesPara("/api/v1/vendas")).toBe(1);
  expect(lerResultado(outra)?.vendas).toHaveLength(2);
});

test("Atualizar que volta vazio apaga o guardado", async () => {
  guardarResultado(chave, resultado([linha()]));
  servidor.use(http.get("*/api/v1/vendas", () => HttpResponse.json(resultado([]))));
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  await userEvent.click(await screen.findByRole("button", { name: "Atualizar" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" }),
  ).toBeVisible();
  expect(lerResultado(chave)).toBeNull();
});

test("no 1c, a busca do topo some", async () => {
  definirEndereco(endereco);
  renderizar(
    <Moldura parametrosIniciais={{}}>
      <PaginaConsulta />
    </Moldura>,
  );
  expect(await screen.findByRole("note")).toHaveTextContent("Este link trouxe uma consulta pronta");
  expect(screen.getAllByRole("textbox", { name: "Número da reserva" })).toHaveLength(1);
});

test("na moldura, o carregando marca o main como ocupado e mostra a faixa; o resultado tira os dois", async () => {
  marcarPendente(chave);
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await delay(50);
      return HttpResponse.json(resultado([linha()]));
    }),
  );
  definirEndereco(endereco);
  const { container } = render(
    <Moldura parametrosIniciais={{}}>
      <PaginaConsulta />
    </Moldura>,
  );
  expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  expect(container.querySelector("[data-faixa]")).not.toBeNull();
  expect(await screen.findByRole("table")).toBeVisible();
  await waitFor(() => expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy"));
  expect(container.querySelector("[data-faixa]")).toBeNull();
});

test("na moldura, o Atualizar liga a faixa mas não marca o main como ocupado: a linha de status é ouvida", async () => {
  const resposta = segurarResposta();
  guardarResultado(chave, resultado([linha()]));
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await resposta.solta;
      return HttpResponse.json(resultado([linha()], { consultadoEm: "2026-11-25T02:10:00+00:00" }));
    }),
  );
  definirEndereco(endereco);
  const { container } = render(
    <Moldura parametrosIniciais={{}}>
      <PaginaConsulta />
    </Moldura>,
  );
  await userEvent.click(await screen.findByRole("button", { name: "Atualizar" }));
  expect(screen.getByText(CARREGANDO)).toBeVisible();
  expect(container.querySelector("[data-faixa]")).not.toBeNull();
  expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
  resposta.soltar();
  expect(await screen.findByText(/Consultado às 23h10/)).toBeVisible();
  await waitFor(() => expect(container.querySelector("[data-faixa]")).toBeNull());
});

test("recarregar uma 13b mostra o 1c (resultado vazio não é guardado)", async () => {
  marcarPendente(chave);
  servidor.use(http.get("*/api/v1/vendas", () => HttpResponse.json(resultado([]))));
  definirEndereco(endereco);
  const { unmount } = render(<PaginaConsulta />);
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" }),
  ).toBeVisible();
  unmount();

  render(<PaginaConsulta />);
  expect(await screen.findByRole("note")).toHaveTextContent("Este link trouxe uma consulta pronta");
  expect(lerResultado(chave)).toBeNull();
  expect(requisicoesPara("/api/v1/vendas")).toBe(1);
});

test("1c: Consultar no mesmo endereço consulta na hora (decisão 2)", async () => {
  const resposta = segurarResposta();
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await resposta.solta;
      return HttpResponse.json(resultado([linha()]));
    }),
  );
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  await screen.findByRole("note");
  await userEvent.click(screen.getByRole("button", { name: "Consultar" }));
  expect(roteador.push).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(CARREGANDO);
  resposta.soltar();
  expect(await screen.findByRole("table")).toBeVisible();
  expect(requisicoesPara("/api/v1/vendas")).toBe(1);
});

test("erro: Tentar de novo consulta na hora, sem navegar", async () => {
  responderEmSequencia(
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    () => HttpResponse.json(resultado([linha()])),
  );
  marcarPendente(chave);
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  const alerta = await screen.findByRole("alert");
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  expect(await screen.findByRole("table")).toBeVisible();
  expect(roteador.push).not.toHaveBeenCalled();
  expect(requisicoesPara("/api/v1/vendas")).toBe(2);
});

test("Cancelar consulta volta ao formulário preenchido", async () => {
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await delay(1000);
      return HttpResponse.json(resultado([linha()]));
    }),
  );
  marcarPendente(chave);
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  expect(roteador.push).toHaveBeenCalledWith("/?data=emissao&de=2026-11-17&ate=2026-11-24");
  expect(temPendente(chave)).toBe(false);
});

test("Cancelar no modo estrito aborta a requisição e não grava nada", async () => {
  const vigia = vigiarChamada();
  servidor.use(
    http.get("*/api/v1/vendas", async ({ request }) => {
      await Promise.race([vigia.acompanhar(request), delay(5000)]);
      return HttpResponse.json(resultado([linha()]));
    }),
  );
  marcarPendente(chave);
  definirEndereco(endereco);
  render(
    <StrictMode>
      <PaginaConsulta />
    </StrictMode>,
  );
  await vigia.iniciou;
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  await waitFor(() => expect(vigia.abortada).toBe(true));
  expect(requisicoesPara("/api/v1/vendas")).toBe(1);
  expect(lerResultado(chave)).toBeNull();
  expect(lerRecentes()).toEqual([]);
});

test.each([
  ["api_stur_sem_resposta", 504, "sem_resposta", ["Tentar de novo", "Alterar consulta"]],
  ["api_stur_acesso_recusado", 502, "acesso_recusado", ["Alterar consulta"]],
  ["api_stur_resposta_invalida", 502, "formato", ["Copiar detalhe", "Alterar consulta"]],
  ["erro_interno", 500, "aplicacao", ["Tentar de novo", "Alterar consulta"]],
] as const)("erro %s (tela 12)", async (codigo, status, tipo, esperadas) => {
  servidor.use(http.get("*/api/v1/vendas", () => HttpResponse.json(erroApi(codigo), { status })));
  marcarPendente(chave);
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  const alerta = await screen.findByRole("alert");
  expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
    TEXTOS_ERRO[tipo].titulo,
  );
  expect(alerta).toHaveTextContent(TEXTOS_ERRO[tipo].mensagem(30));
  expect(alerta).not.toHaveTextContent("Mensagem de teste.");
  expect(acoes(alerta)).toEqual(esperadas);
  expect(within(alerta).queryByText("Detalhe técnico") !== null).toBe(tipo === "formato");
  expect(screen.getByRole("navigation", { name: "Caminho" })).toHaveTextContent(
    "Consulta › Vendas emitidas de 17/11 a 24/11",
  );
  expect(within(alerta).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
    "href",
    "/?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
  expect(
    screen.getByText(
      /^A consulta foi das vendas emitidas de 17\/11 a 24\/11\/2026, às \d{2}h\d{2}\.$/,
    ),
  ).toBeVisible();
});

test("Copiar detalhe copia o código e o detalhe, e diz Copiado por 2 s", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const escrever = vi.spyOn(navigator.clipboard, "writeText");
  const detalhe = ["venda 1001: totalCliente: decimal_parsing"];
  servidor.use(
    http.get("*/api/v1/vendas", () =>
      HttpResponse.json(erroApi("api_stur_resposta_invalida", "Mensagem de teste.", detalhe), {
        status: 502,
      }),
    ),
  );
  marcarPendente(chave);
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  const alerta = await screen.findByRole("alert");
  expect(within(alerta).getByText(/venda •••: totalCliente: decimal_parsing/)).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent("1001");

  await usuario.click(within(alerta).getByRole("button", { name: "Copiar detalhe" }));
  expect(escrever).toHaveBeenCalledWith(
    JSON.stringify({ codigo: "api_stur_resposta_invalida", detalhe }, null, 2),
  );
  expect(await within(alerta).findByRole("button", { name: "Copiado" })).toBeVisible();
  expect(within(alerta).getByText("Copiado", { selector: "[aria-live]" })).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(within(alerta).getByRole("button", { name: "Copiar detalhe" })).toBeVisible();
});

test("422 volta ao formulário com a mensagem no campo", async () => {
  const mensagem = "Um parâmetro da consulta está num formato inválido.";
  servidor.use(
    http.get("*/api/v1/vendas", () =>
      HttpResponse.json(
        { codigo: "parametro_invalido", mensagem, campo: "tipoData" },
        { status: 422 },
      ),
    ),
  );
  marcarPendente(chave);
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  const grupo = await screen.findByRole("radiogroup", { name: "Tipo de data" });
  // A mensagem e o foco no campo chegam num efeito depois de o formulário aparecer.
  await waitFor(() => {
    expect(grupo).toHaveAccessibleDescription(mensagem);
    expect(screen.getByRole("radio", { name: "Emissão" })).toHaveFocus();
  });
  expect(screen.queryByRole("note")).toBeNull();
  expect(screen.getByLabelText("De")).toHaveValue("2026-11-17");
});

test("período depois da cópia sem vendas: 13b com Consultar de 13/11 a 18/11", async () => {
  const depois = "/consulta?data=emissao&de=2026-11-19&ate=2026-11-24";
  const nova = "/consulta?data=emissao&de=2026-11-13&ate=2026-11-18";
  const resposta = segurarResposta();
  responderEmSequencia(
    () => HttpResponse.json(resultado([], { dadosDoSturAte: "2026-11-18T09:30:00" })),
    async () => {
      await resposta.solta;
      return HttpResponse.json(resultado([linha()]));
    },
  );
  marcarPendente(depois);
  definirEndereco(depois);
  render(<PaginaConsulta />);
  await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" });
  const quadro = screen.getByRole("status");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(within(quadro).getByRole("heading", { level: 1 })).toHaveTextContent(
    "Nenhuma venda encontrada",
  );
  expect(quadro).toHaveTextContent(
    "A API do Stur não devolveu nenhuma venda emitida de 19/11 a 24/11/2026. Verifique as datas e consulte de novo.",
  );
  expect(quadro).toHaveTextContent(
    "Dados do Stur até 18/11, 09h30. Uma venda emitida depois disso ainda não aparece aqui. Os mesmos seis dias, terminando na data da cópia, vão de 13/11 a 18/11.",
  );
  expect(acoes(quadro)).toEqual(["Alterar consulta", "Consultar de 13/11 a 18/11"]);
  expect(within(quadro).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
    "href",
    "/?data=emissao&de=2026-11-19&ate=2026-11-24",
  );
  expect(screen.getByText("Consultado às 22h58.")).toBeVisible();

  await userEvent.click(within(quadro).getByRole("button", { name: "Consultar de 13/11 a 18/11" }));
  expect(roteador.push).toHaveBeenCalledWith(nova);
  expect(temPendente(nova)).toBe(true);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Consultando as vendas emitidas de 13/11 a 18/11/2026 na API do Stur.",
  );
  resposta.soltar();
  expect(await screen.findByRole("table")).toBeVisible();
});

test("Atualizar que falha mantém a tabela (decisão 43)", async () => {
  let atualizar: string | null = null;
  const resposta = segurarResposta();
  guardarResultado(chave, resultado([linha()]));
  servidor.use(
    http.get("*/api/v1/vendas", async ({ request }) => {
      atualizar = new URL(request.url).searchParams.get("atualizar");
      await resposta.solta;
      return HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 });
    }),
  );
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  await userEvent.click(await screen.findByRole("button", { name: "Atualizar" }));
  expect(screen.getByText(CARREGANDO)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Cancelar consulta" })).toBeNull();
  expect(screen.getByRole("table")).toBeVisible();
  resposta.soltar();

  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível atualizar.");
  expect(atualizar).toBe("true");
  expect(screen.getByRole("table")).toBeVisible();
  expect(screen.queryByText(CARREGANDO)).toBeNull();
  expect(lerResultado(chave)?.consultadoEm).toBe("2026-11-24T22:58:13.123456-03:00");
});

test("Atualizar com sucesso grava o novo resultado; resposta vazia vira nenhuma venda", async () => {
  guardarResultado(chave, resultado([linha()]));
  responderEmSequencia(
    () => HttpResponse.json(resultado([linha()], { consultadoEm: "2026-11-25T02:10:00+00:00" })),
    () => HttpResponse.json(resultado([])),
  );
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  await userEvent.click(await screen.findByRole("button", { name: "Atualizar" }));
  expect(await screen.findByText(/Consultado às 23h10/)).toBeVisible();
  expect(lerResultado(chave)?.consultadoEm).toBe("2026-11-25T02:10:00+00:00");

  await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" }),
  ).toBeVisible();
  expect(lerResultado(chave)).toBeNull();
});

test("Atualizar de novo enquanto atualiza reusa a mesma chamada", async () => {
  const resposta = segurarResposta();
  guardarResultado(chave, resultado([linha()]));
  servidor.use(
    http.get("*/api/v1/vendas", async () => {
      await resposta.solta;
      return HttpResponse.json(resultado([linha()], { consultadoEm: "2026-11-25T02:10:00+00:00" }));
    }),
  );
  definirEndereco(endereco);
  render(<PaginaConsulta />);
  await userEvent.click(await screen.findByRole("button", { name: "Atualizar" }));
  await userEvent.keyboard("u");
  resposta.soltar();
  expect(await screen.findByText(/Consultado às 23h10/)).toBeVisible();
  expect(screen.queryByText(CARREGANDO)).toBeNull();
  expect(requisicoesPara("/api/v1/vendas")).toBe(1);
});
