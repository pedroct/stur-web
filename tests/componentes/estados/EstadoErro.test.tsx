import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { ErroDaConsulta } from "@/lib/api/cliente";

describe("EstadoErro", () => {
  test("sem os parâmetros novos continua igual: h1, a mensagem do tipo e as ações dele", () => {
    const aoTentar = vi.fn();
    render(
      <EstadoErro
        erro={new ErroDaConsulta("sem_resposta")}
        aoTentar={aoTentar}
        alterarHref="/?reserva=90000001"
        rodape="A consulta foi do número 90000001, às 10h00."
      />,
    );
    const alerta = screen.getByRole("alert");
    expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
      "A API do Stur não respondeu",
    );
    expect(alerta).toHaveTextContent(
      "A API do Stur não respondeu em 30 segundos. Tente de novo em alguns minutos.",
    );
    expect(
      within(alerta)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Tentar de novo"]);
    expect(within(alerta).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
      "href",
      "/?reserva=90000001",
    );
    expect(screen.getByText("A consulta foi do número 90000001, às 10h00.")).toBeVisible();
  });

  test("nivelTitulo h2 troca só o nível do título", () => {
    render(
      <EstadoErro
        erro={new ErroDaConsulta("acesso_recusado")}
        nivelTitulo="h2"
        alterarHref="/?reserva=90000001"
      />,
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Acesso recusado pela API do Stur",
    );
  });

  test("mensagem troca o texto do tipo, e o título fica", () => {
    render(
      <EstadoErro
        erro={new ErroDaConsulta("sem_resposta")}
        mensagem="Mensagem de teste."
        alterarHref="/"
      />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Mensagem de teste.");
    expect(alerta).not.toHaveTextContent("em 30 segundos");
    expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
      "A API do Stur não respondeu",
    );
  });

  test("acaoExtra vira um botão secundário depois do Alterar consulta", async () => {
    const aoClicar = vi.fn();
    render(
      <EstadoErro
        erro={new ErroDaConsulta("aplicacao")}
        aoTentar={() => {}}
        alterarHref="/"
        acaoExtra={{ rotulo: "Ver as 3 vendas", aoClicar }}
      />,
    );
    const alerta = screen.getByRole("alert");
    const acoes = [...alerta.querySelectorAll("a, button")].map((e) => e.textContent);
    expect(acoes).toEqual(["Tentar de novo", "Alterar consulta", "Ver as 3 vendas"]);
    await userEvent.click(within(alerta).getByRole("button", { name: "Ver as 3 vendas" }));
    expect(aoClicar).toHaveBeenCalledOnce();
  });
});
