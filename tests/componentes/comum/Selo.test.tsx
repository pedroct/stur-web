import { render, screen } from "@testing-library/react";
import { Selo, seloDaSituacao } from "@/componentes/comum/Selo";

test.each([
  ["fechada", "Fechada"],
  ["confirmada", "Confirmada"],
  ["reservada", "Reservada"],
  ["cancelada", "Cancelada"],
  ["reaberta", "Reaberta"],
])("selo de %s diz %s", (situacao, texto) => {
  const s = seloDaSituacao(situacao);
  if (s === null) throw new Error("selo esperado");
  render(<Selo {...s}>{s.texto}</Selo>);
  expect(screen.getByText(texto)).toBeVisible();
});

test("tons por situação", () => {
  expect(seloDaSituacao("fechada")).toMatchObject({ tom: "sucesso" });
  expect(seloDaSituacao("cancelada")).toMatchObject({ tom: "neutro", borda: true });
  expect(seloDaSituacao(null)).toBeNull();
});

test("selo mostra ícone e palavra; situação com outra grafia usa a palavra da API", () => {
  expect(seloDaSituacao("CONFIRMADA")).toMatchObject({ tom: "info", texto: "Confirmada" });
  expect(seloDaSituacao("reservada")).toMatchObject({ tom: "neutro", borda: false });
  expect(seloDaSituacao("EM ANÁLISE")).toMatchObject({ tom: "neutro", texto: "Em análise" });
  const s = seloDaSituacao("fechada");
  if (s === null) throw new Error("selo esperado");
  const { container } = render(<Selo {...s}>{s.texto}</Selo>);
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});
