import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ignorarAtalho, useAtalho } from "@/lib/atalhos";

function Tela({ ativo = true }: { ativo?: boolean }) {
  const [vezes, setVezes] = useState(0);
  useAtalho("/", () => setVezes((v) => v + 1), ativo);
  return (
    <>
      <p>acionado {vezes}</p>
      <input aria-label="Campo" />
      <textarea aria-label="Texto" />
      <select aria-label="Escolha">
        <option>a</option>
      </select>
      <div
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        tabIndex={0}
        aria-label="Editável"
      >
        <span>dentro</span>
      </div>
    </>
  );
}

function teclar(alvo: Element, init: KeyboardEventInit = {}) {
  const evento = new KeyboardEvent("keydown", {
    key: "/",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    alvo.dispatchEvent(evento);
  });
  return evento;
}

test("/ aciona fora dos campos e chama preventDefault", () => {
  render(<Tela />);
  const evento = teclar(document.body);
  expect(screen.getByText("acionado 1")).toBeInTheDocument();
  expect(evento.defaultPrevented).toBe(true);
});

test("/ é ignorado dentro dos campos: a barra entra no texto", async () => {
  render(<Tela />);
  const campo = screen.getByRole("textbox", { name: "Campo" });
  await userEvent.type(campo, "a/b");
  expect(campo).toHaveValue("a/b");
  expect(screen.getByText("acionado 0")).toBeInTheDocument();
  for (const alvo of [
    screen.getByLabelText("Texto"),
    screen.getByLabelText("Escolha"),
    screen.getByLabelText("Editável"),
    screen.getByText("dentro"),
  ]) {
    expect(teclar(alvo).defaultPrevented).toBe(false);
  }
  expect(screen.getByText("acionado 0")).toBeInTheDocument();
});

test("com Ctrl, Meta ou Alt não aciona", () => {
  render(<Tela />);
  for (const init of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
    expect(teclar(document.body, init).defaultPrevented).toBe(false);
  }
  expect(screen.getByText("acionado 0")).toBeInTheDocument();
});

test("outra tecla não aciona e inativo não aciona", () => {
  const { rerender } = render(<Tela />);
  teclar(document.body, { key: "u" });
  expect(screen.getByText("acionado 0")).toBeInTheDocument();
  rerender(<Tela ativo={false} />);
  expect(teclar(document.body).defaultPrevented).toBe(false);
  expect(screen.getByText("acionado 0")).toBeInTheDocument();
});

test("ao desmontar, o atalho sai", () => {
  const { unmount } = render(<Tela />);
  unmount();
  expect(teclar(document.body).defaultPrevented).toBe(false);
});

test("ignorarAtalho olha o alvo e os modificadores", () => {
  const campo = document.createElement("input");
  document.body.append(campo);
  const solto = (init: KeyboardEventInit = {}) =>
    new KeyboardEvent("keydown", { key: "/", ...init });
  expect(ignorarAtalho(solto())).toBe(false);
  expect(ignorarAtalho(solto({ ctrlKey: true }))).toBe(true);
  const noCampo = new KeyboardEvent("keydown", { key: "/", bubbles: true });
  Object.defineProperty(noCampo, "target", { value: campo });
  expect(ignorarAtalho(noCampo)).toBe(true);
  campo.remove();
});
