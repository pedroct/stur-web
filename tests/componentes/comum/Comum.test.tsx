import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Aviso } from "@/componentes/comum/Aviso";
import { Esqueleto } from "@/componentes/comum/Esqueleto";
import { Pilula } from "@/componentes/comum/Pilula";

test("aviso informativo é nota e aviso de atenção é alerta", () => {
  render(
    <>
      <Aviso tom="info">Informação</Aviso>
      <Aviso tom="atencao">Atenção</Aviso>
    </>,
  );
  expect(screen.getByRole("note")).toHaveTextContent("Informação");
  expect(screen.getByRole("alert")).toHaveTextContent("Atenção");
});

test("aviso neutro é nota, sobre a superfície sutil, com ícone", () => {
  const { container } = render(<Aviso tom="neutro">Venda cancelada</Aviso>);
  const nota = screen.getByRole("note");
  expect(nota).toHaveTextContent("Venda cancelada");
  expect(nota).toHaveClass("bg-superficie-sutil");
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("esqueleto fica escondido do leitor de tela", () => {
  const { container } = render(<Esqueleto largura={120} altura={16} />);
  const forma = container.firstElementChild;
  expect(forma).toHaveAttribute("aria-hidden", "true");
  expect(forma).toHaveStyle({ width: "120px", height: "16px" });
});

test("pílula alterna com aria-pressed e vira radio com aria-checked", async () => {
  const aoClicar = vi.fn();
  const { rerender } = render(
    <Pilula pressionada onClick={aoClicar}>
      Fechada
    </Pilula>,
  );
  const botao = screen.getByRole("button", { name: "Fechada" });
  expect(botao).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(botao);
  expect(aoClicar).toHaveBeenCalledTimes(1);
  rerender(
    <Pilula papel="radio" pressionada={false}>
      Hoje
    </Pilula>,
  );
  expect(screen.getByRole("radio", { name: "Hoje" })).toHaveAttribute("aria-checked", "false");
});
