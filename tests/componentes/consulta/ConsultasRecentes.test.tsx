import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsultasRecentes } from "@/componentes/consulta/ConsultasRecentes";
import { lerOrigem, registrarOrigem } from "@/lib/armazenamento/origem";
import { temPendente } from "@/lib/armazenamento/pendentes";
import { registrarRecente } from "@/lib/armazenamento/recentes";
import { roteador } from "../../navegacao";

const PERIODO = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24";

test("consultas recentes: descrição, detalhe e quando; some quando vazia", () => {
  const { container, unmount } = render(<ConsultasRecentes />);
  expect(container).toBeEmptyDOMElement();
  unmount();

  const agora = new Date();
  registrarRecente(
    {
      endereco: PERIODO,
      descricao: "Vendas emitidas de 17/11 a 24/11/2026",
      detalhe: "54 vendas",
    },
    new Date(agora.getTime() - 2 * 60_000),
  );
  render(<ConsultasRecentes />);
  expect(screen.getByRole("heading", { level: 2, name: "Consultas recentes" })).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Vendas emitidas de 17/11 a 24/11/2026 · 54 vendas" }),
  ).toHaveAttribute("href", PERIODO);
  expect(screen.getByText("há 2 min")).toBeVisible();
  expect(screen.getByText("Ficam só neste navegador, sem dado da venda.")).toBeVisible();
});

test("clicar numa recente de período marca o pedido pendente antes de navegar", async () => {
  registrarRecente(
    {
      endereco: PERIODO,
      descricao: "Vendas emitidas de 17/11 a 24/11/2026",
      detalhe: "54 vendas",
    },
    new Date(),
  );
  roteador.push.mockImplementationOnce((destino: string) => {
    expect(temPendente(destino)).toBe(true);
  });
  render(<ConsultasRecentes />);
  await userEvent.click(screen.getByRole("link", { name: /Vendas emitidas de 17\/11/ }));
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith(PERIODO);
});

test("clicar numa recente de número só navega", async () => {
  registrarRecente(
    { endereco: "/reservas/90000001", descricao: "Reserva 90000001", detalhe: "BILHETE NACIONAL" },
    new Date(),
  );
  render(<ConsultasRecentes />);
  const link = screen.getByRole("link", { name: "Reserva 90000001 · BILHETE NACIONAL" });
  expect(link).toHaveAttribute("href", "/reservas/90000001");
  await userEvent.click(link);
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith("/reservas/90000001");
  expect(temPendente("/reservas/90000001")).toBe(false);
});

test("a mais recente vem primeiro", () => {
  registrarRecente(
    { endereco: "/reservas/90000001", descricao: "Reserva 90000001", detalhe: "2 vendas" },
    new Date(Date.now() - 60_000),
  );
  registrarRecente(
    { endereco: "/reservas/90000002", descricao: "Reserva 90000002", detalhe: "1 venda" },
    new Date(),
  );
  render(<ConsultasRecentes />);
  const links = screen.getAllByRole("link");
  expect(links[0]).toHaveTextContent("Reserva 90000002");
  expect(links[1]).toHaveTextContent("Reserva 90000001");
});

test("abrir uma recente apaga a origem guardada do resultado (decisão 28)", async () => {
  registrarOrigem({ enderecoResultado: "/consulta?de=2026-11-17", tituloCurto: "x", vendas: [] });
  registrarRecente(
    { endereco: "/reservas/90000001", descricao: "Reserva 90000001", detalhe: "BILHETE NACIONAL" },
    new Date(),
  );
  let origemAoNavegar: unknown = "não navegou";
  roteador.push.mockImplementationOnce(() => {
    origemAoNavegar = lerOrigem();
  });
  render(<ConsultasRecentes />);
  await userEvent.click(screen.getByRole("link", { name: "Reserva 90000001 · BILHETE NACIONAL" }));
  expect(roteador.push).toHaveBeenCalledExactlyOnceWith("/reservas/90000001");
  expect(origemAoNavegar).toBeNull();
});
