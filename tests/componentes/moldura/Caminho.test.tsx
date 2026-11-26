import { render, screen, within } from "@testing-library/react";
import { Caminho } from "@/componentes/moldura/Caminho";

test("caminho", () => {
  render(<Caminho niveis={[{ rotulo: "Vendas emitidas de 17/11 a 24/11" }]} />);
  const nav = screen.getByRole("navigation", { name: "Caminho" });
  expect(nav).toHaveTextContent("Consulta › Vendas emitidas de 17/11 a 24/11");
  expect(within(nav).getByText("Vendas emitidas de 17/11 a 24/11")).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("o primeiro nível é sempre Consulta, link para a nova consulta", () => {
  render(<Caminho niveis={[{ rotulo: "Reserva 90000001" }]} />);
  const link = screen.getByRole("link", { name: "Consulta" });
  expect(link).toHaveAttribute("href", "/");
  expect(link).toHaveAttribute("title", "Nova consulta");
  expect(link).not.toHaveAttribute("aria-current");
});

test("níveis do meio podem ser links e só o último é a página atual", () => {
  render(
    <Caminho
      niveis={[
        { rotulo: "Vendas emitidas de 17/11 a 24/11", href: "/consulta?de=2026-11-17" },
        { rotulo: "Reserva 90000001" },
      ]}
    />,
  );
  const nav = screen.getByRole("navigation", { name: "Caminho" });
  expect(nav).toHaveTextContent("Consulta › Vendas emitidas de 17/11 a 24/11 › Reserva 90000001");
  expect(
    within(nav).getByRole("link", { name: "Vendas emitidas de 17/11 a 24/11" }),
  ).toHaveAttribute("href", "/consulta?de=2026-11-17");
  expect(nav.querySelectorAll("[aria-current]")).toHaveLength(1);
  expect(within(nav).getByText("Reserva 90000001")).toHaveAttribute("aria-current", "page");
});

test("o espaço da direita fica fora da navegação", () => {
  render(
    <Caminho
      niveis={[{ rotulo: "Reserva 90000001" }]}
      direita={<button type="button">Anterior</button>}
    />,
  );
  expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument();
  expect(
    within(screen.getByRole("navigation", { name: "Caminho" })).queryByRole("button"),
  ).toBeNull();
});
