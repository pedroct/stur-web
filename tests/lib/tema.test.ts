import { gravarTema, lerTema, SCRIPT_TEMA } from "@/lib/tema";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

test("sem escolha, segue o computador", () => expect(lerTema()).toBe("sistema"));

test("escuro vira data-theme dark; sistema tira o atributo", () => {
  gravarTema("escuro");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("stur-web:tema")).toBe("escuro");
  gravarTema("sistema");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});

test("o script do head aplica a escolha antes da pintura", () => {
  localStorage.setItem("stur-web:tema", "claro");
  new Function(SCRIPT_TEMA)();
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("valor estranho no navegador vale sistema", () => {
  localStorage.setItem("stur-web:tema", "roxo");
  expect(lerTema()).toBe("sistema");
});
