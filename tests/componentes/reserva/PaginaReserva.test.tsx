import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { StrictMode } from "react";
import { PaginaReserva } from "@/componentes/reserva/PaginaReserva";
import { ReservaProvisoria, VendaProvisoria } from "@/componentes/reserva/ReservaProvisoria";
import { TEXTOS_ERRO } from "@/lib/api/textos-erro";
import { lerRecentes } from "@/lib/armazenamento/recentes";
import { erroApi, reserva, resumoVenda } from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";
import { requisicoesPara, servidor, vigiarChamada } from "../../servidor";

const CAMINHO = "/api/v1/reservas/90000001";

function responderReserva(numero: number, ...resumos: ReturnType<typeof resumoVenda>[]) {
  servidor.use(
    http.get(`*/api/v1/reservas/${numero}`, () => HttpResponse.json(reserva(numero, resumos))),
  );
}

/** Responde, na ordem, cada uma das respostas dadas; a última vale para as chamadas seguintes. */
function responderEmSequencia(...respostas: (() => Response | Promise<Response>)[]) {
  let vez = 0;
  servidor.use(
    http.get("*/api/v1/reservas/90000001", () => {
      const responder = respostas[Math.min(vez, respostas.length - 1)];
      vez += 1;
      if (!responder) throw new Error("sem resposta");
      return responder();
    }),
  );
}

function caminho(): string {
  return screen.getByRole("navigation", { name: "Caminho" }).textContent ?? "";
}

test("carregando por número: linha de status e Cancelar consulta", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000001", async () => {
      await delay(1000);
      return HttpResponse.json(reserva(90000001, [resumoVenda()]));
    }),
  );
  render(<PaginaReserva numeroTexto="90000001" />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Consultando a reserva 90000001 na API do Stur. Pode levar até 30 segundos.",
  );
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  expect(roteador.push).toHaveBeenCalledWith("/?reserva=90000001");
  expect(roteador.replace).not.toHaveBeenCalled();
});

test("nenhuma venda (tela 13, critério 19)", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000099", () =>
      HttpResponse.json(reserva(90000099, [], { dadosDoSturAte: "2026-11-18T09:30:00" })),
    ),
  );
  render(<PaginaReserva numeroTexto="90000099" />);
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

test("uma venda abre a venda, sem passar pela reserva", async () => {
  responderReserva(90000001, resumoVenda({ idreserva: 1001, produto: "BILHETE NACIONAL" }));
  render(<PaginaReserva numeroTexto="90000001" />);
  await waitFor(() =>
    expect(roteador.replace).toHaveBeenCalledWith("/reservas/90000001/vendas/1001"),
  );
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  expect(lerRecentes()).toHaveLength(1);
  expect(lerRecentes()[0]).toMatchObject({
    endereco: "/reservas/90000001",
    descricao: "Reserva 90000001",
    detalhe: "BILHETE NACIONAL",
  });
});

test("duas vendas mostram a reserva provisória", async () => {
  responderReserva(90000001, resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 }));
  render(<PaginaReserva numeroTexto="90000001" />);
  expect(await screen.findByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(roteador.replace).not.toHaveBeenCalled();
  expect(lerRecentes()[0]).toMatchObject({
    endereco: "/reservas/90000001",
    descricao: "Reserva 90000001",
    detalhe: "2 vendas",
  });
  expect(document.body).not.toHaveTextContent("1001");
});

test("número com letras não chama a API", async () => {
  render(<PaginaReserva numeroTexto="9000x" />);
  const quadro = await screen.findByRole("status");
  expect(quadro).toHaveTextContent(
    "Nenhuma venda com o número de reserva 9000x. Verifique o número no Stur e consulte de novo.",
  );
  expect(quadro).not.toHaveTextContent("Dados do Stur");
  expect(screen.queryByText(/Consultado às/)).toBeNull();
  expect(caminho()).toBe("Consulta › Reserva 9000x");
  expect(within(quadro).getByRole("link", { name: "Alterar consulta" })).toBeVisible();
  expect(requisicoesPara("/api/v1/reservas/9000")).toBe(0);
  expect(requisicoesPara("/api/v1/reservas/9000x")).toBe(0);
  expect(lerRecentes()).toEqual([]);
});

test("Tentar de novo consulta de novo sem navegar", async () => {
  responderEmSequencia(
    () => HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    () => HttpResponse.json(reserva(90000001, [resumoVenda({ idreserva: 1001 })])),
  );
  render(<PaginaReserva numeroTexto="90000001" />);
  const alerta = await screen.findByRole("alert");
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  await waitFor(() =>
    expect(roteador.replace).toHaveBeenCalledWith("/reservas/90000001/vendas/1001"),
  );
  expect(roteador.push).not.toHaveBeenCalled();
  expect(requisicoesPara(CAMINHO)).toBe(2);
});

test("no modo estrito do React, uma requisição só", async () => {
  responderReserva(90000001, resumoVenda(), resumoVenda({ idreserva: 1002 }));
  render(
    <StrictMode>
      <PaginaReserva numeroTexto="90000001" />
    </StrictMode>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
  expect(requisicoesPara(CAMINHO)).toBe(1);
});

test("no modo estrito, uma venda troca o endereço uma vez só", async () => {
  responderReserva(90000001, resumoVenda({ idreserva: 1001 }));
  render(
    <StrictMode>
      <PaginaReserva numeroTexto="90000001" />
    </StrictMode>,
  );
  await waitFor(() => expect(roteador.replace).toHaveBeenCalled());
  expect(roteador.replace).toHaveBeenCalledTimes(1);
  expect(requisicoesPara(CAMINHO)).toBe(1);
});

test("erro por número (tela 12)", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/90000001", () =>
      HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    ),
  );
  render(<PaginaReserva numeroTexto="90000001" />);
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
  render(<PaginaReserva numeroTexto="90000001" />);
  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent(TEXTOS_ERRO.acesso_recusado.titulo);
  expect(alerta).toHaveTextContent("Acesso recusado pela API do Stur");
  expect(document.body).not.toHaveTextContent("Nenhuma venda encontrada");
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
  render(<PaginaReserva numeroTexto="90000001" />);
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

test("Cancelar consulta aborta a chamada e não registra recente (modo estrito)", async () => {
  const vigia = vigiarChamada();
  servidor.use(
    http.get("*/api/v1/reservas/90000001", async ({ request }) => {
      await Promise.race([vigia.acompanhar(request), delay(5000)]);
      return HttpResponse.json(reserva(90000001, [resumoVenda()]));
    }),
  );
  render(
    <StrictMode>
      <PaginaReserva numeroTexto="90000001" />
    </StrictMode>,
  );
  await vigia.iniciou;
  await userEvent.click(screen.getByRole("button", { name: "Cancelar consulta" }));
  await waitFor(() => expect(vigia.abortada).toBe(true));
  expect(roteador.push).toHaveBeenCalledWith("/?reserva=90000001");
  expect(roteador.replace).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(lerRecentes()).toEqual([]);
});

test("a reserva provisória só tem moldura, caminho e título", () => {
  render(<ReservaProvisoria numero="90000001" />);
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(screen.getByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
});

test("a venda provisória lê o número da rota e não mostra o idreserva", () => {
  definirEndereco("/reservas/90000001/vendas/1001");
  render(<VendaProvisoria />);
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(screen.getByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
  expect(document.body).not.toHaveTextContent("1001");
});
