import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { camposSemMolde, MOLDES, type Molde } from "@/lib/venda/moldes";

const TODOS: Molde[] = [
  "cabecalho",
  "financeiro",
  "lancamento",
  "itinerario",
  "hospedagem",
  "veiculo",
  "servicos",
  "pessoa",
  "conta",
  "vinculos",
  "mais-detalhes",
  "codigos",
  "incentivo",
];

test("há uma lista por molde", () => {
  expect(Object.keys(MOLDES).sort()).toEqual([...TODOS].sort());
});

test("todo caminho declarado num molde é do Anexo B", () => {
  const caminhos = new Set(CAMPOS_ANEXO_B.map((c) => c.caminho));
  const declarados = TODOS.flatMap((m) => MOLDES[m].map((d) => d.caminho));
  expect(declarados.filter((c) => !caminhos.has(c))).toEqual([]);
});

test("sem nada declarado, o grupo mostra todos os campos dele, na ordem do Anexo B", () => {
  const hospedagem = camposSemMolde("Hospedagem (hotelaria)", ["hospedagem"]);
  const doGrupo = CAMPOS_ANEXO_B.filter(
    (c) => c.grupo === "Hospedagem (hotelaria)" && !c.conteiner,
  );
  const declarados = new Set(MOLDES.hospedagem.map((d) => d.caminho));
  expect(hospedagem).toEqual(doGrupo.filter((c) => !declarados.has(c.caminho)));
  expect(camposSemMolde("Grupo que não existe", TODOS)).toEqual([]);
});

test("o campo que um dos moldes declara sai do grupo", () => {
  const lista = MOLDES.hospedagem;
  lista.push({ caminho: "detalheItem[].regime", naTela: { tipo: "rotulo", texto: "Regime" } });
  try {
    const caminhos = camposSemMolde("Hospedagem (hotelaria)", ["conta", "hospedagem"]).map(
      (c) => c.caminho,
    );
    expect(caminhos).not.toContain("detalheItem[].regime");
    expect(caminhos).toContain("detalheItem[].dtEntrada");
    // Um molde que não está na casa não tira o campo.
    expect(camposSemMolde("Hospedagem (hotelaria)", ["conta"]).map((c) => c.caminho)).toContain(
      "detalheItem[].regime",
    );
  } finally {
    lista.pop();
  }
});

test("os contêineres de lista nunca aparecem como valor do grupo", () => {
  const itinerario = camposSemMolde("Itinerário (aéreo e rodoviário)", []).map((c) => c.caminho);
  expect(itinerario).not.toContain("trechos");
  expect(itinerario).toContain("trechos[].cia");
  const conta = camposSemMolde("Conta do cliente", []).map((c) => c.caminho);
  expect(conta).not.toContain("detalheItem[].taxas");
  expect(conta).toContain("detalheItem[].taxas[].vlrCliente");
  const todos = [...new Set(CAMPOS_ANEXO_B.map((c) => c.grupo))].flatMap((g) =>
    camposSemMolde(g, []),
  );
  expect(todos.filter((c) => c.conteiner)).toEqual([]);
});
