import { seloTextoDaSituacao } from "@/lib/venda/situacao";

test.each([
  ["FECHADA", { tom: "sucesso", icone: "check", rotulo: "Fechada" }],
  ["confirmada", { tom: "info", icone: "info", rotulo: "Confirmada" }],
  ["Reservada", { tom: "neutro", icone: "relogio", rotulo: "Reservada" }],
  ["CANCELADA", { tom: "neutro-borda", icone: "x", rotulo: "Cancelada" }],
  ["reaberta", { tom: "neutro", icone: "info", rotulo: "Reaberta" }],
  ["EM ANÁLISE", { tom: "neutro", icone: "info", rotulo: "Em análise" }],
])("situação %s", (situacao, selo) => {
  expect(seloTextoDaSituacao(situacao)).toEqual(selo);
});

test("situação nula não tem selo", () => {
  expect(seloTextoDaSituacao(null)).toBeNull();
});
