import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BotaoTema } from "@/componentes/moldura/BotaoTema";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

test("nome acessível diz o tema em uso", () => {
  render(<BotaoTema />);
  expect(
    screen.getByRole("button", { name: "Tema igual ao computador. Trocar o tema" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("abre o menu com as três opções, a marcada e os atalhos", async () => {
  render(<BotaoTema />);
  await userEvent.click(screen.getByRole("button", { name: /Trocar o tema/ }));
  const menu = await screen.findByRole("menu", { name: "Tema" });
  expect(
    within(menu)
      .getAllByRole("menuitemradio")
      .map((o) => o.textContent),
  ).toEqual(["Claro", "Escuro", "Igual ao computador"]);
  expect(within(menu).getByRole("menuitemradio", { name: "Igual ao computador" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(menu).toHaveTextContent(
    "A escolha fica salva neste navegador. Igual ao computador segue o tema do sistema operacional.",
  );
  expect(menu).toHaveTextContent("Atalhos de teclado");
});

test("escolher fecha o menu, grava e devolve o foco ao botão", async () => {
  render(<BotaoTema />);
  await userEvent.click(screen.getByRole("button", { name: /Trocar o tema/ }));
  await userEvent.click(await screen.findByRole("menuitemradio", { name: "Escuro" }));
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  expect(screen.getByRole("button", { name: "Tema escuro. Trocar o tema" })).toHaveFocus();
  expect(localStorage.getItem("stur-web:tema")).toBe("escuro");
});

test("Esc fecha o menu e devolve o foco", async () => {
  render(<BotaoTema />);
  await userEvent.click(screen.getByRole("button", { name: /Trocar o tema/ }));
  await screen.findByRole("menu");
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  expect(screen.getByRole("button", { name: /Trocar o tema/ })).toHaveFocus();
});
