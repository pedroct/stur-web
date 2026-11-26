import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { useParams } from "next/navigation";
import { StrictMode } from "react";
import LayoutDaReserva from "@/app/reservas/[numero]/layout";
import { Moldura } from "@/componentes/moldura/Moldura";
import { useValorDoPainel } from "@/componentes/venda/painel-contexto";
import type { ReservaConsultada, ResumoVenda } from "@/contrato/tipos";
import { TEXTOS_ERRO } from "@/lib/api/textos-erro";
import { lerOrigem, registrarOrigem } from "@/lib/armazenamento/origem";
import { lerRecentes } from "@/lib/armazenamento/recentes";
import { lerResto } from "@/lib/venda/rota";
import { erroApi, reserva, resumoVenda, vendaAgi, vendaConsultada } from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";
import { requisicoesPara, segurarResposta, servidor, vigiarChamada } from "../../servidor";

const CAMINHO = "/api/v1/reservas/90000001";
const VENDA_1 = "/api/v1/reservas/90000001/vendas/1001";
const VENDA_2 = "/api/v1/reservas/90000001/vendas/1002";

type Responder = () => Response | Promise<Response>;

function umaVenda(numero = 90000001): ReservaConsultada {
  return reserva(numero, [
    resumoVenda({ numero, idreserva: 1001, produto: "BILHETE NACIONAL", classificacao: "Aéreo" }),
  ]);
}

function duasVendas(numero = 90000001): ReservaConsultada {
  return reserva(numero, [
    resumoVenda({ numero, idreserva: 1001, produto: "HOTEL NAC" }),
    resumoVenda({ numero, idreserva: 1002, produto: "SEGURO VIAGEM", classificacao: "Diversos" }),
  ]);
}

/** A venda como o backend a manda: com a reserva junto e a posição dela. */
function vendaDe(r: ReservaConsultada, idreserva: number) {
  const posicao = r.reserva.vendas.findIndex((v) => v.resumo.idreserva === idreserva) + 1;
  const produto = r.reserva.vendas[posicao - 1]?.resumo.produto ?? null;
  return vendaConsultada({
    venda: vendaAgi({ reserva: r.numero, idreserva, nomeproduto: produto }),
    reserva: r.reserva,
    posicao,
    consultadoEm: r.consultadoEm,
    dadosDoSturAte: r.dadosDoSturAte,
  });
}

/** Responde, na ordem, cada uma das respostas dadas; a última vale para as chamadas seguintes. */
function emSequencia(caminho: string, ...respostas: Responder[]) {
  let vez = 0;
  servidor.use(
    http.get(`*${caminho}`, () => {
      const responder = respostas[Math.min(vez, respostas.length - 1)];
      vez += 1;
      if (!responder) throw new Error("sem resposta");
      return responder();
    }),
  );
}

/** A reserva e as vendas dela; venda de fora da reserva dá 404, como no backend. */
function programar(r: ReservaConsultada) {
  servidor.use(
    http.get(`*/api/v1/reservas/${r.numero}`, () => HttpResponse.json(r)),
    http.get(`*/api/v1/reservas/${r.numero}/vendas/:id`, ({ params }) => {
      const id = Number(params.id);
      return r.reserva.vendas.some((v) => v.resumo.idreserva === id)
        ? HttpResponse.json(vendaDe(r, id))
        : HttpResponse.json(erroApi("venda_nao_encontrada"), { status: 404 });
    }),
  );
}

function responderReserva(numero: number, ...resumos: ResumoVenda[]) {
  programar(reserva(numero, resumos));
}

function abrir(endereco: string, { estrito = false, moldura = false } = {}) {
  definirEndereco(endereco);
  const pagina = moldura ? (
    <Moldura parametrosIniciais={{}}>
      <LayoutDaReserva />
    </Moldura>
  ) : (
    <LayoutDaReserva />
  );
  return render(estrito ? <StrictMode>{pagina}</StrictMode> : pagina);
}

function caminho(): string {
  return screen.getByRole("navigation", { name: "Caminho" }).textContent ?? "";
}

async function esperarCliente() {
  return screen.findByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" });
}

/** O título da venda aberta dentro da reserva (h2 "Venda {k} · {produto}"). */
const VENDA_ABERTA = /^Venda \d+ · /;

async function esperarVendaAberta() {
  return screen.findByRole("heading", { level: 2, name: VENDA_ABERTA });
}

/** Clica na linha da venda na tabela; com uma venda aberta, reabre a tabela pela barra antes. */
async function abrirNaTabela(produto: string, k: number) {
  const resumo = screen.queryByText(/^Ver as \d+ vendas$/, { selector: "summary" });
  if (resumo !== null && !resumo.closest("details")?.open) await userEvent.click(resumo);
  await userEvent.click(
    screen.getByRole("link", { name: new RegExp(`^${produto} venda ${k} de`) }),
  );
}

// --- Rota única: o estado fica no layout (decisão 16) ---

test("venda por endereço direto faz uma chamada só, e a reserva vem junto", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVendaAberta();
  expect(screen.getByText("Reserva 90000001 · 2 vendas")).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Próxima venda: venda 2 de 2, SEGURO VIAGEM" }),
  ).toHaveAttribute("href", "/reservas/90000001/vendas/1002");
  expect(caminho()).toBe("Consulta › Reserva 90000001 › Venda 1 de 2");
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(requisicoesPara(CAMINHO)).toBe(0);
});

test("trocar o endereço para o serviço e voltar não chama a API", async () => {
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarCliente();
  definirEndereco("/reservas/90000001/vendas/1001/servicos/1");
  expect(screen.getByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();
  definirEndereco("/reservas/90000001/vendas/1001/dado-cru");
  definirEndereco("/reservas/90000001/vendas/1001");
  expect(screen.getByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(requisicoesPara(CAMINHO)).toBe(0);
});

test("trocar para outra venda chama só a venda nova", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVendaAberta();
  await abrirNaTabela("SEGURO VIAGEM", 2);
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001/vendas/1002", { scroll: false });
  await waitFor(() => expect(caminho()).toBe("Consulta › Reserva 90000001 › Venda 2 de 2"));
  await esperarVendaAberta();
  expect(requisicoesPara(VENDA_2)).toBe(1);

  act(() => roteador.back());
  await waitFor(() => expect(caminho()).toBe("Consulta › Reserva 90000001 › Venda 1 de 2"));
  expect(screen.getByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeVisible();
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(requisicoesPara(VENDA_2)).toBe(1);
  expect(requisicoesPara(CAMINHO)).toBe(0);
});

test("voltar a /reservas/n com a reserva na memória não chama a API", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001");
  await esperarCliente();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  await abrirNaTabela("HOTEL NAC", 1);
  await esperarVendaAberta();
  expect(screen.getByRole("link", { name: "Reserva 90000001" })).toHaveAttribute(
    "href",
    "/reservas/90000001",
  );

  act(() => roteador.back());
  await waitFor(() => expect(caminho()).toBe("Consulta › Reserva 90000001"));
  expect(screen.queryByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeNull();
  expect(requisicoesPara(CAMINHO)).toBe(1);
  expect(requisicoesPara(VENDA_1)).toBe(1);
});

test("voltar a /reservas/n com uma venda só na memória troca para a venda, sem chamar a API", async () => {
  programar(umaVenda());
  abrir("/reservas/90000001");
  await esperarCliente();
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  definirEndereco("/reservas/90000001");
  await waitFor(() => expect(roteador.replace).toHaveBeenCalledTimes(2));
  expect(roteador.replace).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1001");
  await esperarCliente();
  expect(requisicoesPara(CAMINHO)).toBe(1);
  expect(requisicoesPara(VENDA_1)).toBe(1);
});

// --- Carregando, erro e vazio (telas 11, 12 e 13) ---

test("carregando: esqueleto, linha de status e Cancelar consulta (tela 11)", async () => {
  servidor.use(
    http.get(`*${VENDA_1}`, async () => {
      await delay(1000);
      return HttpResponse.json(vendaDe(duasVendas(), 1001));
    }),
  );
  abrir("/reservas/90000001/vendas/1001");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Consultando a reserva 90000001 na API do Stur. Pode levar até 30 segundos.",
  );
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(document.querySelector("[data-esqueleto-venda]")).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryByRole("heading")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  expect(roteador.push).toHaveBeenCalledWith("/?reserva=90000001");
  expect(roteador.replace).not.toHaveBeenCalled();
});

test("carregando por número: linha de status e Cancelar consulta", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000001", async () => {
      await delay(1000);
      return HttpResponse.json(reserva(90000001, [resumoVenda()]));
    }),
  );
  abrir("/reservas/90000001");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Consultando a reserva 90000001 na API do Stur. Pode levar até 30 segundos.",
  );
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  expect(roteador.push).toHaveBeenCalledWith("/?reserva=90000001");
  expect(roteador.replace).not.toHaveBeenCalled();
});

test("erro da venda no lugar da página (tela 12), com Tentar de novo", async () => {
  emSequencia(
    VENDA_1,
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    () => HttpResponse.json(vendaDe(umaVenda(), 1001)),
  );
  abrir("/reservas/90000001/vendas/1001");
  const alerta = await screen.findByRole("alert");
  expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
    "A API do Stur não respondeu",
  );
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(screen.getByText(/^A consulta foi do número 90000001, às \d{2}h\d{2}\.$/)).toBeVisible();
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  await esperarCliente();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(requisicoesPara(VENDA_1)).toBe(2);
  expect(requisicoesPara(CAMINHO)).toBe(0);
  expect(roteador.push).not.toHaveBeenCalled();
});

test("erro de outra venda dentro da reserva fica no lugar da venda, com Tentar de novo", async () => {
  const r = duasVendas();
  programar(r);
  emSequencia(
    VENDA_2,
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    () => HttpResponse.json(vendaDe(r, 1002)),
  );
  abrir("/reservas/90000001");
  await esperarCliente();
  await abrirNaTabela("SEGURO VIAGEM", 2);
  const alerta = await screen.findByRole("alert");
  // A reserva segue à vista, com a barra já na venda 2 e o erro em h2 (12c).
  expect(screen.getByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();
  expect(screen.getByText("Venda 2 de 2 · SEGURO VIAGEM")).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Venda anterior: venda 1 de 2, HOTEL NAC" }),
  ).toBeVisible();
  expect(within(alerta).getByRole("heading", { level: 2 })).toHaveTextContent(
    "A API do Stur não respondeu",
  );
  expect(alerta).toHaveTextContent("A venda 2 não abriu: a API do Stur não respondeu");
  expect(caminho()).toBe("Consulta › Reserva 90000001 › Venda 2 de 2");
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  await esperarVendaAberta();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(requisicoesPara(VENDA_2)).toBe(2);
  expect(requisicoesPara(CAMINHO)).toBe(1);
});

test("nenhuma venda (tela 13, critério 19)", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000099", () =>
      HttpResponse.json(reserva(90000099, [], { dadosDoSturAte: "2026-11-18T09:30:00" })),
    ),
  );
  abrir("/reservas/90000099");
  await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" });
  const quadro = screen.getByRole("status");
  expect(caminho()).toBe("Consulta › Reserva 90000099");
  expect(within(quadro).getByRole("heading", { level: 1 })).toHaveTextContent(
    "Nenhuma venda encontrada",
  );
  expect(quadro).toHaveTextContent(
    "Nenhuma venda com o número de reserva 90000099. Verifique o número no Stur e consulte de novo.",
  );
  expect(quadro).toHaveTextContent(
    "Dados do Stur até 18/11, 09h30. Uma reserva criada depois disso ainda não aparece aqui.",
  );
  expect(within(quadro).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
    "href",
    "/?reserva=90000099",
  );
  expect(screen.getByText(/^Consultado às \d{2}h\d{2}\.$/)).toBeVisible();
  expect(lerRecentes()).toEqual([]);
  expect(roteador.replace).not.toHaveBeenCalled();
});

test("número com uma venda abre a venda (P7); duas abrem a reserva sem venda aberta", async () => {
  responderReserva(90000001, resumoVenda({ idreserva: 1001, produto: "BILHETE NACIONAL" }));
  const { unmount } = abrir("/reservas/90000001");
  await waitFor(() =>
    expect(roteador.replace).toHaveBeenCalledWith("/reservas/90000001/vendas/1001"),
  );
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  await esperarCliente();
  expect(screen.getByText("Reserva 90000001", { selector: "section span" })).toBeVisible();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(document.body).not.toHaveTextContent("Venda 1 de 1");
  expect(requisicoesPara(CAMINHO)).toBe(1);
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(lerRecentes()).toHaveLength(1);
  expect(lerRecentes()[0]).toMatchObject({
    endereco: "/reservas/90000001",
    descricao: "Reserva 90000001",
    detalhe: "BILHETE NACIONAL",
  });
  unmount();

  responderReserva(90000002, resumoVenda({ idreserva: 1002 }), resumoVenda({ idreserva: 1003 }));
  abrir("/reservas/90000002");
  await esperarCliente();
  expect(caminho()).toBe("Consulta › Reserva 90000002");
  expect(screen.getByText("Reserva 90000002 · 2 vendas")).toBeVisible();
  expect(screen.getAllByRole("link", { name: / venda \d de 2$/ })).toHaveLength(2);
  expect(screen.queryByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeNull();
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  expect(lerRecentes()[0]).toMatchObject({
    endereco: "/reservas/90000002",
    descricao: "Reserva 90000002",
    detalhe: "2 vendas",
  });
  expect(document.body).not.toHaveTextContent("1002");
  expect(document.body).not.toHaveTextContent("1003");
});

test("venda que não é do número (404) mostra a decisão 21", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1009");
  await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" });
  const quadro = screen.getByRole("status");
  expect(quadro).toHaveTextContent(
    "A reserva 90000001 não tem essa venda. Abra a reserva para ver as vendas dela.",
  );
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(screen.queryByText(/Consultado às/)).toBeNull();
  expect(requisicoesPara("/api/v1/reservas/90000001/vendas/1009")).toBe(1);

  await userEvent.click(within(quadro).getByRole("button", { name: "Ver a reserva 90000001" }));
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001");
  await esperarCliente();
  expect(screen.getByText("Reserva 90000001 · 2 vendas")).toBeVisible();
  expect(requisicoesPara(CAMINHO)).toBe(1);

  // Com a reserva na memória, a venda de fora dela nem chega à API.
  definirEndereco("/reservas/90000001/vendas/1008");
  expect(
    await screen.findByText(
      "A reserva 90000001 não tem essa venda. Abra a reserva para ver as vendas dela.",
    ),
  ).toBeVisible();
  expect(requisicoesPara("/api/v1/reservas/90000001/vendas/1008")).toBe(0);
});

test("resto inválido e número com letras mostram a tela 13 sem chamar a API", async () => {
  const { unmount } = abrir("/reservas/90000001/vendas/abc");
  let quadro = await screen.findByRole("status");
  expect(quadro).toHaveTextContent(
    "Nenhuma venda com o número de reserva 90000001. Verifique o número no Stur e consulte de novo.",
  );
  expect(quadro).not.toHaveTextContent("Dados do Stur");
  expect(screen.queryByText(/Consultado às/)).toBeNull();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  unmount();

  abrir("/reservas/9000x");
  quadro = await screen.findByRole("status");
  expect(quadro).toHaveTextContent(
    "Nenhuma venda com o número de reserva 9000x. Verifique o número no Stur e consulte de novo.",
  );
  expect(quadro).not.toHaveTextContent("Dados do Stur");
  expect(screen.queryByText(/Consultado às/)).toBeNull();
  expect(caminho()).toBe("Consulta › Reserva 9000x");
  expect(within(quadro).getByRole("link", { name: "Alterar consulta" })).toBeVisible();
  expect(requisicoesPara(CAMINHO)).toBe(0);
  expect(requisicoesPara("/api/v1/reservas/9000")).toBe(0);
  expect(requisicoesPara("/api/v1/reservas/9000x")).toBe(0);
  expect(lerRecentes()).toEqual([]);
});

test("número que o backend recusa (422) mostra a tela 13 do texto inválido", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000001", () =>
      HttpResponse.json(
        { codigo: "parametro_invalido", mensagem: "Número inválido.", campo: "numero" },
        { status: 422 },
      ),
    ),
  );
  abrir("/reservas/90000001");
  await screen.findByRole("heading", { level: 1, name: "Nenhuma venda encontrada" });
  const quadro = screen.getByRole("status");
  expect(quadro).toHaveTextContent(
    "Nenhuma venda com o número de reserva 90000001. Verifique o número no Stur e consulte de novo.",
  );
  expect(quadro).not.toHaveTextContent("Dados do Stur");
  expect(screen.queryByText(/Consultado às/)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(lerRecentes()).toEqual([]);
});

test("Tentar de novo consulta de novo sem navegar", async () => {
  programar(umaVenda());
  emSequencia(
    CAMINHO,
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    () => HttpResponse.json(umaVenda()),
  );
  abrir("/reservas/90000001");
  const alerta = await screen.findByRole("alert");
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  await waitFor(() =>
    expect(roteador.replace).toHaveBeenCalledWith("/reservas/90000001/vendas/1001"),
  );
  await esperarCliente();
  expect(roteador.push).not.toHaveBeenCalled();
  expect(requisicoesPara(CAMINHO)).toBe(2);
});

test("erro por número (tela 12)", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000001", () =>
      HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    ),
  );
  abrir("/reservas/90000001");
  const alerta = await screen.findByRole("alert");
  expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
    "A API do Stur não respondeu",
  );
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(within(alerta).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
    "href",
    "/?reserva=90000001",
  );
  expect(screen.getByText(/^A consulta foi do número 90000001, às \d{2}h\d{2}\.$/)).toBeVisible();
  expect(lerRecentes()).toEqual([]);
});

test("credencial recusada não diz que a venda não existe (critério 10)", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000001", () =>
      HttpResponse.json(erroApi("api_stur_acesso_recusado"), { status: 502 }),
    ),
  );
  abrir("/reservas/90000001");
  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent(TEXTOS_ERRO.acesso_recusado.titulo);
  expect(alerta).toHaveTextContent("Acesso recusado pela API do Stur");
  expect(document.body).not.toHaveTextContent("Nenhuma venda encontrada");
});

// --- Modo estrito e cancelamento ---

test("no modo estrito, uma requisição só", async () => {
  programar(duasVendas());
  const { unmount } = abrir("/reservas/90000001", { estrito: true });
  await esperarCliente();
  expect(requisicoesPara(CAMINHO)).toBe(1);
  unmount();

  abrir("/reservas/90000001/vendas/1002", { estrito: true });
  await esperarVendaAberta();
  expect(requisicoesPara(VENDA_2)).toBe(1);
  expect(requisicoesPara(CAMINHO)).toBe(1);
});

test("no modo estrito, uma venda troca o endereço uma vez só", async () => {
  programar(umaVenda());
  abrir("/reservas/90000001", { estrito: true });
  await waitFor(() => expect(roteador.replace).toHaveBeenCalled());
  await esperarCliente();
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  expect(requisicoesPara(CAMINHO)).toBe(1);
  expect(requisicoesPara(VENDA_1)).toBe(1);
});

test("Cancelar consulta aborta a chamada e não registra recente (modo estrito)", async () => {
  const vigia = vigiarChamada();
  servidor.use(
    http.get("*/api/v1/reservas/90000001", async ({ request }) => {
      await Promise.race([vigia.acompanhar(request), delay(5000)]);
      return HttpResponse.json(reserva(90000001, [resumoVenda()]));
    }),
  );
  abrir("/reservas/90000001", { estrito: true });
  await vigia.iniciou;
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  await waitFor(() => expect(vigia.abortada).toBe(true));
  expect(roteador.push).toHaveBeenCalledWith("/?reserva=90000001");
  expect(roteador.replace).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(lerRecentes()).toEqual([]);
});

// --- Atualizar (12b) ---

test("Atualizar com venda aberta pede só a venda; se falha, mantém os dados (12b)", async () => {
  const r = duasVendas();
  programar(r);
  emSequencia(
    VENDA_1,
    () => HttpResponse.json(vendaDe(r, 1001)),
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
  );
  abrir("/reservas/90000001/vendas/1001");
  await esperarVendaAberta();
  const atualizar = screen.getByRole("button", { name: "Atualizar" });
  expect(atualizar).toHaveAttribute("title", "Atualizar (u)");
  expect(atualizar).toHaveAttribute("aria-keyshortcuts", "u");
  expect(screen.getByText(/Consultado às 22h48/)).toHaveTextContent(
    "Consultado às 22h48 · Atualizar · Dados do Stur até 18/11, 09h30",
  );
  await userEvent.click(atualizar);
  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent(
    "Não foi possível atualizar. A API do Stur não respondeu em 30 segundos. Os dados abaixo são da consulta das 22h48.",
  );
  expect(screen.getByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeVisible();
  expect(requisicoesPara(VENDA_1)).toBe(2);
  expect(requisicoesPara(CAMINHO)).toBe(0);
});

test("Atualizar sem venda aberta pede só a reserva, e as vendas guardadas saem", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVendaAberta();
  act(() => roteador.push("/reservas/90000001"));
  await waitFor(() =>
    expect(screen.queryByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeNull(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  await waitFor(() => expect(requisicoesPara(CAMINHO)).toBe(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled());
  expect(requisicoesPara(VENDA_1)).toBe(1);

  // A venda 1 saiu da memória: abri-la de novo a pede de novo.
  await abrirNaTabela("HOTEL NAC", 1);
  await esperarVendaAberta();
  expect(requisicoesPara(VENDA_1)).toBe(2);
  expect(requisicoesPara(CAMINHO)).toBe(1);
});

test("a venda aberta mais nova que a reserva: a linha da consulta e a reserva vêm dela", async () => {
  const antes = duasVendas();
  // A venda chega depois, com a reserva como o Stur a tem agora: o total da venda 1 mudou.
  const depois = reserva(90000001, [
    resumoVenda({ idreserva: 1001, produto: "HOTEL NAC", totalCliente: "1500.00" }),
    resumoVenda({ idreserva: 1002, produto: "SEGURO VIAGEM", classificacao: "Diversos" }),
  ]);
  servidor.use(
    http.get(`*${CAMINHO}`, () =>
      HttpResponse.json({ ...antes, consultadoEm: "2026-11-24T10:00:00.000001-03:00" }),
    ),
    http.get(`*${VENDA_2}`, () =>
      HttpResponse.json({ ...vendaDe(depois, 1002), consultadoEm: "2026-11-24T11:15:00-03:00" }),
    ),
  );
  abrir("/reservas/90000001");
  await esperarCliente();
  expect(screen.getByText(/^Consultado às 10h00/)).toBeVisible();
  expect(screen.getByText("Total das 2 vendas ativas").closest("tr")).toHaveTextContent("2.000,00");

  await abrirNaTabela("SEGURO VIAGEM", 2);
  await esperarVendaAberta();
  expect(screen.getByText(/^Consultado às 11h15/)).toBeVisible();

  // De volta à reserva, sem chamar a API: ela é a que veio com a venda.
  act(() => roteador.back());
  await waitFor(() =>
    expect(screen.queryByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeNull(),
  );
  expect(screen.getByText(/^Consultado às 11h15/)).toBeVisible();
  expect(screen.getByText("Total das 2 vendas ativas").closest("tr")).toHaveTextContent("2.500,00");
  expect(requisicoesPara(CAMINHO)).toBe(1);
  expect(requisicoesPara(VENDA_2)).toBe(1);
});

test("Atualizar que dá certo tira o aviso da falha", async () => {
  const r = umaVenda();
  emSequencia(
    VENDA_1,
    () => HttpResponse.json(vendaDe(r, 1001)),
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    () =>
      HttpResponse.json({ ...vendaDe(r, 1001), consultadoEm: "2026-11-24T23:05:00.000001-03:00" }),
  );
  abrir("/reservas/90000001/vendas/1001");
  await esperarCliente();
  await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  const alerta = await screen.findByRole("alert");
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(screen.getByText(/Consultado às 23h05/)).toBeVisible();
  expect(requisicoesPara(VENDA_1)).toBe(3);
});

// --- Recentes, busca do topo e moldura ---

test("abrir pela venda registra a recente da reserva", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1002");
  await esperarVendaAberta();
  expect(lerRecentes()).toHaveLength(1);
  expect(lerRecentes()[0]).toMatchObject({
    endereco: "/reservas/90000001",
    descricao: "Reserva 90000001",
    detalhe: "2 vendas",
  });
});

test("busca do topo com o mesmo número consulta de novo", async () => {
  programar(duasVendas());
  const { unmount } = abrir("/reservas/90000001", { moldura: true });
  await esperarCliente();
  await abrirNaTabela("HOTEL NAC", 1);
  await esperarVendaAberta();
  act(() => roteador.back());
  await waitFor(() =>
    expect(screen.queryByRole("heading", { level: 2, name: VENDA_ABERTA })).toBeNull(),
  );
  expect(requisicoesPara(CAMINHO)).toBe(1);

  registrarOrigem({ enderecoResultado: "/consulta?de=2026-11-17", tituloCurto: "x", vendas: [] });
  const busca = screen.getByRole("search");
  await userEvent.click(within(busca).getByRole("button", { name: "Buscar" }));
  await waitFor(() => expect(requisicoesPara(CAMINHO)).toBe(2));
  await esperarCliente();
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(lerOrigem()).toBeNull();
  // As vendas guardadas saíram: abrir a venda 1 a pede de novo.
  await abrirNaTabela("HOTEL NAC", 1);
  await esperarVendaAberta();
  expect(requisicoesPara(VENDA_1)).toBe(2);
  unmount();

  // Com uma venda só, a busca refaz a reserva e a venda.
  programar(umaVenda(90000002));
  abrir("/reservas/90000002", { moldura: true });
  await esperarCliente();
  const v = "/api/v1/reservas/90000002/vendas/1001";
  expect(requisicoesPara("/api/v1/reservas/90000002")).toBe(1);
  expect(requisicoesPara(v)).toBe(1);
  await userEvent.click(within(screen.getByRole("search")).getByRole("button", { name: "Buscar" }));
  await waitFor(() => expect(requisicoesPara(v)).toBe(2));
  await esperarCliente();
  expect(requisicoesPara("/api/v1/reservas/90000002")).toBe(2);
});

test("a moldura fica ocupada na primeira carga e não no Atualizar", async () => {
  const r = umaVenda();
  const primeira = segurarResposta();
  const segunda = segurarResposta();
  emSequencia(
    VENDA_1,
    async () => {
      await primeira.solta;
      return HttpResponse.json(vendaDe(r, 1001));
    },
    async () => {
      await segunda.solta;
      return HttpResponse.json(vendaDe(r, 1001));
    },
  );
  abrir("/reservas/90000001/vendas/1001", { moldura: true });
  const principal = screen.getByRole("main");
  await waitFor(() => expect(principal).toHaveAttribute("aria-busy", "true"));
  expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled();

  primeira.soltar();
  await esperarCliente();
  await waitFor(() => expect(principal).not.toHaveAttribute("aria-busy"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled());

  await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled());
  expect(principal).not.toHaveAttribute("aria-busy");
  expect(screen.getByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();

  segunda.soltar();
  await waitFor(() => expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled());
  expect(principal).not.toHaveAttribute("aria-busy");
});

test("venda que carrega dentro da reserva liga a faixa sem ocupar a página", async () => {
  const r = duasVendas();
  programar(r);
  const segura = segurarResposta();
  servidor.use(
    http.get(`*${VENDA_2}`, async () => {
      await segura.solta;
      return HttpResponse.json(vendaDe(r, 1002));
    }),
  );
  abrir("/reservas/90000001", { moldura: true });
  await esperarCliente();
  await abrirNaTabela("SEGURO VIAGEM", 2);
  await waitFor(() => expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled());
  expect(screen.getByRole("main")).not.toHaveAttribute("aria-busy");
  segura.soltar();
  await esperarVendaAberta();
  await waitFor(() => expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled());
});

// --- Painel (decisão 20) ---

function usePainelDoEndereco() {
  const { resto } = useParams<{ resto?: string[] }>();
  return useValorDoPainel(90000001, lerResto(resto));
}

test("painel aberto aqui: abrir faz push, trocar faz replace e fechar volta", () => {
  definirEndereco("/reservas/90000001/vendas/1001");
  const { result } = renderHook(usePainelDoEndereco);
  expect(result.current.painelAberto).toBe(false);

  act(() => result.current.abrirServico(1001, 2));
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001/vendas/1001/servicos/2", {
    scroll: false,
  });
  expect(result.current.painelAberto).toBe(true);

  act(() => result.current.trocarServico(3));
  expect(roteador.replace).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1001/servicos/3", {
    scroll: false,
  });
  act(() => result.current.trocarParaDadoCru());
  expect(roteador.replace).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1001/dado-cru", {
    scroll: false,
  });

  act(() => result.current.fecharPainel());
  expect(roteador.back).toHaveBeenCalledTimes(1);
  expect(result.current.painelAberto).toBe(false);

  act(() => result.current.abrirDadoCru(1001));
  expect(roteador.push).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1001/dado-cru", {
    scroll: false,
  });
  act(() => result.current.fecharPainel());
  expect(roteador.back).toHaveBeenCalledTimes(2);
  expect(roteador.replace).toHaveBeenCalledTimes(2);
});

test("painel por link direto: fechar faz replace para a venda", () => {
  definirEndereco("/reservas/90000001/vendas/1001/servicos/2");
  const { result } = renderHook(usePainelDoEndereco);
  expect(result.current.painelAberto).toBe(true);
  act(() => result.current.fecharPainel());
  expect(roteador.back).not.toHaveBeenCalled();
  expect(roteador.replace).toHaveBeenCalledWith("/reservas/90000001/vendas/1001", {
    scroll: false,
  });
  expect(result.current.painelAberto).toBe(false);
});

test("painel fechado pelo Voltar do navegador: o próximo, por link direto, fecha com replace", () => {
  definirEndereco("/reservas/90000001/vendas/1001");
  const { result } = renderHook(usePainelDoEndereco);
  act(() => result.current.abrirServico(1001, 1));
  act(() => roteador.back());
  expect(result.current.painelAberto).toBe(false);
  act(() => definirEndereco("/reservas/90000001/vendas/1001/servicos/2"));
  roteador.back.mockClear();
  act(() => result.current.fecharPainel());
  expect(roteador.back).not.toHaveBeenCalled();
  expect(roteador.replace).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1001", {
    scroll: false,
  });
});

test("404 de venda não encontrada na chamada da reserva não repete a chamada", async () => {
  servidor.use(
    http.get(`*${CAMINHO}`, () =>
      HttpResponse.json(erroApi("venda_nao_encontrada"), { status: 404 }),
    ),
  );
  abrir("/reservas/90000001");
  const alerta = await screen.findByRole("alert");
  expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
    "Erro nesta aplicação",
  );
  // Dá tempo de uma segunda chamada aparecer, se a entrada voltasse a pedir a reserva.
  await act(() => new Promise((resolver) => setTimeout(resolver, 50)));
  expect(requisicoesPara(CAMINHO)).toBe(1);
});
