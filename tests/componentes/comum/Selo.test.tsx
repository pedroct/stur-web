import { render, screen } from "@testing-library/react";
import { Calendar, Check, CircleX, Clock, CreditCard, Info } from "lucide-react";
import { dadosDoSeloTexto, Selo, seloDaSituacao } from "@/componentes/comum/Selo";
import type { SeloTexto } from "@/lib/venda/lancamentos";

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

test.each([
  ["check", Check],
  ["info", Info],
  ["relogio", Clock],
  ["calendario", Calendar],
  ["x", CircleX],
  ["cartao", CreditCard],
] as const)("dadosDoSeloTexto traduz o ícone %s", (icone, componente) => {
  const dados = dadosDoSeloTexto({ tom: "sucesso", icone, rotulo: "Palavra" });
  expect(dados).toEqual({ tom: "sucesso", icone: componente, borda: false, texto: "Palavra" });
});

test("dadosDoSeloTexto traduz neutro-borda em tom neutro com borda", () => {
  const selo: SeloTexto = { tom: "neutro-borda", icone: "calendario", rotulo: "A vencer em 07/12" };
  expect(dadosDoSeloTexto(selo)).toMatchObject({ tom: "neutro", borda: true, icone: Calendar });
  expect(dadosDoSeloTexto({ ...selo, tom: "atencao" })).toMatchObject({
    tom: "atencao",
    borda: false,
  });
});
