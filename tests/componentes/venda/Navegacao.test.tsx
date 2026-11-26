import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import LayoutDaReserva from "@/app/reservas/[numero]/layout";
import { Moldura } from "@/componentes/moldura/Moldura";
import { CopiarParaEnviar } from "@/componentes/venda/CopiarParaEnviar";
import type { ReservaConsultada } from "@/contrato/tipos";
import { lerOrigem, type Origem, registrarOrigem } from "@/lib/armazenamento/origem";
import {
  calculos,
  contaServico,
  reserva,
  resumoVenda,
  servicoAgi,
  vendaAgi,
  vendaConsultada,
} from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";
import { requisicoesPara, servidor } from "../../servidor";

const VENDA_1 = "/api/v1/reservas/90000001/vendas/1001";
const RESULTADO = "/consulta?de=2026-11-17&ate=2026-11-24&tipoData=emissao";
const TITULO = "Vendas emitidas de 17/11 a 24/11";

const ORIGEM: Origem = {
  enderecoResultado: RESULTADO,
  tituloCurto: TITULO,
  vendas: [
    { numero: 90000003, idreserva: 3001, produto: "CARRO NAC" },
    { numero: 90000001, idreserva: 1001, produto: "HOTEL NAC" },
    { numero: 90000002, idreserva: 2001, produto: "RODOVIARIO NAC" },
  ],
};

function umaVenda(): ReservaConsultada {
  return reserva(90000001, [resumoVenda({ idreserva: 1001, produto: "HOTEL NAC" })]);
}

function duasVendas(): ReservaConsultada {
  return reserva(90000001, [
    resumoVenda({ idreserva: 1001, produto: "HOTEL NAC" }),
    resumoVenda({ idreserva: 1002, produto: "SEGURO VIAGEM", classificacao: "Diversos" }),
  ]);
}

/** A reserva e as vendas dela, com `servicos` serviços na venda 1001. */
function programar(r: ReservaConsultada, servicos = 1) {
  servidor.use(
    http.get(`*/api/v1/reservas/${r.numero}`, () => HttpResponse.json(r)),
    http.get(`*/api/v1/reservas/${r.numero}/vendas/:id`, ({ params }) => {
      const idreserva = Number(params.id);
      const posicao = r.reserva.vendas.findIndex((v) => v.resumo.idreserva === idreserva) + 1;
      return HttpResponse.json(
        vendaConsultada({
          venda: vendaAgi({
            reserva: r.numero,
            idreserva,
            detalheItem: Array.from({ length: servicos }, () => servicoAgi()),
          }),
          calculos: calculos({
            servicos: Array.from({ length: servicos }, (_, indice) => contaServico({ indice })),
          }),
          reserva: r.reserva,
          posicao,
          consultadoEm: r.consultadoEm,
          dadosDoSturAte: r.dadosDoSturAte,
        }),
      );
    }),
  );
}

function abrir(endereco: string, moldura = false) {
  definirEndereco(endereco);
  return render(
    moldura ? (
      <Moldura parametrosIniciais={{}}>
        <LayoutDaReserva />
      </Moldura>
    ) : (
      <LayoutDaReserva />
    ),
  );
}

function caminho(): string {
  return screen.getByRole("navigation", { name: "Caminho" }).textContent ?? "";
}

async function esperarVenda() {
  return screen.findByRole("heading", { name: "CLIENTE EXEMPLO LTDA" });
}

// --- Caminho e setas do resultado (tela 8b) ---

test("a venda vinda do resultado mostra o caminho do resultado e as setas", async () => {
  registrarOrigem(ORIGEM);
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();

  expect(caminho()).toBe(`Consulta › ${TITULO} › Reserva 90000001`);
  expect(screen.getByText("2 de 3 no resultado")).toBeVisible();
  const anterior = screen.getByRole("link", { name: "Anterior do resultado: 90000003, CARRO NAC" });
  expect(anterior).toHaveAttribute("href", "/reservas/90000003/vendas/3001");
  expect(anterior).toHaveAttribute("title", "Anterior do resultado (,)");
  expect(anterior).toHaveAttribute("aria-keyshortcuts", ",");
  const proxima = screen.getByRole("link", {
    name: "Próxima do resultado: 90000002, RODOVIARIO NAC",
  });
  expect(proxima).toHaveAttribute("href", "/reservas/90000002/vendas/2001");
  expect(proxima).toHaveAttribute("title", "Próxima do resultado (.)");
  expect(proxima).toHaveAttribute("aria-keyshortcuts", ".");
  // As setas ficam fora da navegação do caminho.
  expect(screen.getByRole("navigation", { name: "Caminho" })).not.toContainElement(proxima);
});

test("o nível do resultado leva ao resultado guardado, sem chamar a API", async () => {
  registrarOrigem(ORIGEM);
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  const nivel = within(screen.getByRole("navigation", { name: "Caminho" })).getByRole("link", {
    name: TITULO,
  });
  expect(nivel).toHaveAttribute("href", RESULTADO);
  expect(requisicoesPara("/api/v1/vendas")).toBe(0);
  expect(requisicoesPara(VENDA_1)).toBe(1);
});

test("sem origem guardada, o caminho é o da busca e não há setas do resultado", async () => {
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(screen.queryByText(/no resultado/)).toBeNull();
  expect(screen.queryByRole("link", { name: /do resultado/ })).toBeNull();
  await userEvent.keyboard(".");
  expect(roteador.push).not.toHaveBeenCalled();
});

test("origem sem a venda aberta não vale: nem caminho nem setas", async () => {
  registrarOrigem({ ...ORIGEM, vendas: ORIGEM.vendas.filter((v) => v.idreserva !== 1001) });
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
  expect(screen.queryByText(/no resultado/)).toBeNull();
});

test("a venda aberta dentro da reserva vinda do resultado põe a venda no fim do caminho", async () => {
  registrarOrigem(ORIGEM);
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1001");
  await screen.findByRole("heading", { level: 2, name: /^Venda 1 · / });
  expect(caminho()).toBe(`Consulta › ${TITULO} › Reserva 90000001 › Venda 1 de 2`);
  expect(screen.getByText("2 de 3 no resultado")).toBeVisible();
});

test("a primeira e a última do resultado têm a seta do lado de fora desligada", async () => {
  registrarOrigem({ ...ORIGEM, vendas: ORIGEM.vendas.slice(1) });
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  expect(screen.getByText("1 de 2 no resultado")).toBeVisible();
  expect(screen.getByRole("button", { name: "Anterior do resultado" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await userEvent.keyboard(",");
  expect(roteador.push).not.toHaveBeenCalled();
});

// --- Atalhos , . u ---

test("`.` vai para a próxima do resultado, e `,` para a anterior, com push", async () => {
  registrarOrigem(ORIGEM);
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  // A venda de destino não está programada: o push não muda a página.
  roteador.push.mockImplementationOnce(() => {}).mockImplementationOnce(() => {});
  await userEvent.keyboard(".");
  expect(roteador.push).toHaveBeenLastCalledWith("/reservas/90000002/vendas/2001");
  await userEvent.keyboard(",");
  expect(roteador.push).toHaveBeenLastCalledWith("/reservas/90000003/vendas/3001");
  expect(roteador.push).toHaveBeenCalledTimes(2);
});

test("clicar na seta vai para a venda do resultado", async () => {
  registrarOrigem(ORIGEM);
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  roteador.push.mockImplementationOnce(() => {});
  await userEvent.click(
    screen.getByRole("link", { name: "Próxima do resultado: 90000002, RODOVIARIO NAC" }),
  );
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith("/reservas/90000002/vendas/2001");
});

test("`u` faz Atualizar, e fica desligado enquanto atualiza", async () => {
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  expect(requisicoesPara(VENDA_1)).toBe(1);
  await userEvent.keyboard("u");
  expect(requisicoesPara(VENDA_1)).toBe(2);
});

test("com um painel aberto, `u`, `,` e `.` não agem", async () => {
  registrarOrigem(ORIGEM);
  programar(umaVenda(), 2);
  abrir("/reservas/90000001/vendas/1001/servicos/2");
  await screen.findByRole("dialog");
  expect(requisicoesPara(VENDA_1)).toBe(1);
  await userEvent.keyboard("u");
  await userEvent.keyboard(",");
  await userEvent.keyboard(".");
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(roteador.push).not.toHaveBeenCalled();
});

// --- Decisão 28: só vale a origem vinda do resultado ---

test("chegar pela busca do topo depois de passar pelo resultado não mostra as setas", async () => {
  registrarOrigem(ORIGEM);
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001", true);
  await esperarVenda();
  expect(screen.getByText("2 de 3 no resultado")).toBeVisible();

  // A busca já vem com o número do endereço: buscar de novo refaz a reserva sem o resultado.
  await userEvent.click(within(screen.getByRole("search")).getByRole("button", { name: "Buscar" }));
  await esperarVenda();
  expect(lerOrigem()).toBeNull();
  expect(screen.queryByText(/no resultado/)).toBeNull();
  expect(caminho()).toBe("Consulta › Reserva 90000001");
});

// --- Copiar para enviar ---

async function copiar(): Promise<string> {
  const usuario = userEvent.setup();
  const escrever = vi.spyOn(navigator.clipboard, "writeText");
  await usuario.click(screen.getByRole("button", { name: "Copiar para enviar" }));
  const [texto] = escrever.mock.calls.at(-1) ?? [];
  return String(texto);
}

test("a venda sozinha copia o endereço e o resumo da venda", async () => {
  programar(umaVenda());
  abrir("/reservas/90000001/vendas/1001");
  await esperarVenda();
  expect(
    screen.getByText("Copia o endereço e um resumo desta venda, para colar numa mensagem"),
  ).toBeVisible();
  const texto = await copiar();
  const linhas = texto.split("\n");
  expect(linhas[0]).toBe("Consulta de reserva do Stur");
  expect(linhas[1]).toBe(`${window.location.origin}/reservas/90000001/vendas/1001`);
  expect(linhas.at(-3)).toBe("Id interno da venda: 1001");
  expect(linhas.at(-1)).toBe("O que diverge do Stur:");
  expect(await screen.findByRole("button", { name: "Copiado" })).toBeVisible();
});

test("a reserva sem venda aberta copia o resumo da reserva", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001");
  await esperarVenda();
  expect(
    screen.getByText("Copia o endereço e um resumo desta reserva, para colar numa mensagem"),
  ).toBeVisible();
  const linhas = (await copiar()).split("\n");
  expect(linhas[1]).toBe(`${window.location.origin}/reservas/90000001`);
  expect(linhas[2]).toBe("Reserva 90000001 (2 vendas)");
});

test("com uma venda aberta na reserva, o botão copia o resumo da venda", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1002");
  await screen.findByRole("heading", { level: 2, name: /^Venda 2 · / });
  expect(
    screen.getByText("Copia o endereço e um resumo desta venda, para colar numa mensagem"),
  ).toBeVisible();
  const linhas = (await copiar()).split("\n");
  expect(linhas[1]).toBe(`${window.location.origin}/reservas/90000001/vendas/1002`);
  expect(linhas[2]).toBe("Reserva 90000001 (venda 2 de 2)");
});

test('"Copiado" some depois de 2 s', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const escrever = vi.spyOn(navigator.clipboard, "writeText");
  render(<CopiarParaEnviar texto={() => "o texto"} ajuda="Copia tudo" />);
  await usuario.click(screen.getByRole("button", { name: "Copiar para enviar" }));
  expect(escrever).toHaveBeenCalledWith("o texto");
  expect(screen.getByRole("button", { name: "Copiado" })).toBeVisible();
  await act(() => vi.advanceTimersByTimeAsync(1900));
  expect(screen.getByRole("button", { name: "Copiado" })).toBeVisible();
  await act(() => vi.advanceTimersByTimeAsync(200));
  expect(screen.getByRole("button", { name: "Copiar para enviar" })).toBeVisible();
});

test("sem acesso à área de transferência, diz que não foi possível copiar, também por 2 s", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<CopiarParaEnviar texto={() => "o texto"} ajuda="Copia tudo" />);
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("negado"));
  await usuario.click(screen.getByRole("button", { name: "Copiar para enviar" }));
  expect(screen.getByRole("button", { name: "Não foi possível copiar" })).toBeVisible();
  await act(() => vi.advanceTimersByTimeAsync(2000));
  expect(screen.getByRole("button", { name: "Copiar para enviar" })).toBeVisible();
});
