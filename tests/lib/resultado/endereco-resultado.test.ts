import { CONSULTA_VAZIA } from "@/lib/consulta/consulta";
import { escreverEnderecoResultado, REFINAMENTOS_VAZIOS } from "@/lib/resultado/refinar";

const periodo = { ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" };

test("endereço do resultado: chave, refinamentos, página e por, cada um omitido no padrão", () => {
  expect(escreverEnderecoResultado(periodo, { ...REFINAMENTOS_VAZIOS, q: "GAMA" }, 2, 50, 20)).toBe(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&q=GAMA&pagina=2&por=50",
  );
  expect(escreverEnderecoResultado(periodo, REFINAMENTOS_VAZIOS, 1, 20, 20)).toBe(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
});

test("por igual ao padrão sai do endereço e a página 1 também", () => {
  expect(
    escreverEnderecoResultado(periodo, { ...REFINAMENTOS_VAZIOS, soNaoFecham: true }, 1, 100, 100),
  ).toBe("/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&f.contas=nao-fecham");
  expect(escreverEnderecoResultado(periodo, REFINAMENTOS_VAZIOS, 3, 20, 20)).toBe(
    "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&pagina=3",
  );
});
