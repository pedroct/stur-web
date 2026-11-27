import { fraseSemEquivalente, SEM_EQUIVALENTE } from "@/lib/venda/sem-equivalente";

test("um bloco", () => {
  expect(fraseSemEquivalente(["servicos"])).toBe("O Stur também mostra ISSQN, que a API não traz.");
});

test("vários blocos, na ordem pedida e sem repetir", () => {
  expect(fraseSemEquivalente(["recebimentos", "pagamentos"])).toBe(
    "O Stur também mostra Condição de Recebimento, Observação, valor do Repassado ao Fornecedor, Nota Fiscal e Responsável pelo Crédito, que a API não traz.",
  );
});

test("a lista da IA 11, sem as notas do documento", () => {
  expect(SEM_EQUIVALENTE.tarifas).toEqual(["Tipo de Pagamento", "Tarifa Balcão"]);
  expect(SEM_EQUIVALENTE.pessoa).toHaveLength(8);
  expect(fraseSemEquivalente([])).toBe("");
});
