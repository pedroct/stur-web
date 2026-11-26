import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Cabecalho } from "@/componentes/moldura/Cabecalho";
import { definirEndereco, roteador } from "../../navegacao";

test("cabeçalho: logo leva à nova consulta e a busca do topo só aceita dígitos", async () => {
  render(<Cabecalho comBusca />);
  expect(screen.getByRole("link", { name: /Consulta de reserva/ })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: /Consulta de reserva/ })).toHaveAttribute(
    "title",
    "Nova consulta",
  );
  const campo = screen.getByRole("textbox", { name: "Número da reserva" });
  await userEvent.type(campo, "9000 0001");
  await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001");
});

test("letras digitadas na busca somem", async () => {
  render(<Cabecalho comBusca />);
  const campo = screen.getByRole("textbox", { name: "Número da reserva" });
  await userEvent.type(campo, "9000x1");
  expect(campo).toHaveValue("90001");
});

test("letras coladas na busca também somem", async () => {
  render(<Cabecalho comBusca />);
  const campo = screen.getByRole("textbox", { name: "Número da reserva" });
  await userEvent.click(campo);
  await userEvent.paste("RES-9000 0001 ");
  expect(campo).toHaveValue("90000001");
});

test("busca vazia não navega e marca o campo", async () => {
  render(<Cabecalho comBusca />);
  const campo = screen.getByRole("textbox", { name: "Número da reserva" });
  expect(campo).not.toHaveAttribute("aria-invalid", "true");
  await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
  expect(roteador.push).not.toHaveBeenCalled();
  expect(campo).toHaveAttribute("aria-invalid", "true");
  expect(campo).toHaveFocus();
  expect(screen.queryByRole("alert")).toBeNull();
  await userEvent.type(campo, "9");
  expect(campo).not.toHaveAttribute("aria-invalid", "true");
});

test("na rota da reserva, a busca mostra o número", () => {
  definirEndereco("/reservas/90000099");
  render(<Cabecalho comBusca />);
  expect(screen.getByRole("textbox", { name: "Número da reserva" })).toHaveValue("90000099");
});

test("a busca acompanha o número da rota quando a rota muda", () => {
  definirEndereco("/reservas/90000099");
  render(<Cabecalho comBusca />);
  definirEndereco("/reservas/90000100");
  expect(screen.getByRole("textbox", { name: "Número da reserva" })).toHaveValue("90000100");
});

test("a busca tem o atalho / e o campo que o atalho procura", () => {
  render(<Cabecalho comBusca />);
  const campo = screen.getByRole("textbox", { name: "Número da reserva" });
  expect(campo).toHaveAttribute("aria-keyshortcuts", "/");
  expect(campo).toHaveAttribute("inputmode", "numeric");
  expect(campo).toHaveAttribute("placeholder", "Número da reserva");
  expect(campo).toHaveAttribute("data-atalho-numero");
});

test("sem a busca, o cabeçalho mostra só a logo e o botão de tema", () => {
  render(<Cabecalho comBusca={false} />);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: "Buscar" })).toBeNull();
  expect(screen.getByRole("button", { name: /Trocar o tema/ })).toBeInTheDocument();
  expect(screen.getAllByAltText("A3 Turismo").length).toBeGreaterThan(0);
});
