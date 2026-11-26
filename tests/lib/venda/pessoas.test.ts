import { linhaDaPessoa } from "@/lib/venda/pessoas";
import { servicoAgi } from "../../fabrica";

const PESSOA = { nomePaxCompleto: "Teste Fulano", nomePax: "FULANO/TESTE" };

test("pessoa igual ao lançamento não repete", () => {
  expect(linhaDaPessoa(servicoAgi(PESSOA), "Hotelaria", null)).toBe(
    "Hóspede Teste Fulano · na reserva: FULANO/TESTE",
  );
  expect(
    linhaDaPessoa(
      servicoAgi({ nomePaxCompleto: "Teste Fulano", nomePax: "TESTE/ FULANO" }),
      "Hotelaria",
      null,
    ),
  ).toBe("Hóspede Teste Fulano");
});

test("aéreo com tipo, bilhete e localizador", () => {
  const s = servicoAgi({ ...PESSOA, descricaoSiglaTipoPax: "ADULTO", bilhete: "0000000001" });
  expect(linhaDaPessoa(s, "Aéreo", "LOC001")).toBe(
    "Passageiro Teste Fulano, adulto · no bilhete: FULANO/TESTE · bilhete 0000000001 · localizador LOC001",
  );
});

test("rodoviário, locação, pacote e seguro", () => {
  expect(linhaDaPessoa(servicoAgi(PESSOA), "Rodoviário", null)).toBe(
    "Passageiro Teste Fulano · na passagem: FULANO/TESTE",
  );
  expect(linhaDaPessoa(servicoAgi(PESSOA), "Locação", null)).toBe(
    "Condutor Teste Fulano · na reserva: FULANO/TESTE",
  );
  expect(linhaDaPessoa(servicoAgi(PESSOA), "Pacote", null)).toBe(
    "Passageiro Teste Fulano · na reserva: FULANO/TESTE",
  );
  expect(linhaDaPessoa(servicoAgi(PESSOA), "Diversos", null, "SEGURO INT")).toBe(
    "Segurado Teste Fulano · na reserva: FULANO/TESTE",
  );
});

test("só o nome do lançamento, ou nome nenhum", () => {
  expect(linhaDaPessoa(servicoAgi({ nomePax: "FULANO/TESTE" }), "Aéreo", "LOC001")).toBe(
    "Passageiro FULANO/TESTE · localizador LOC001",
  );
  expect(linhaDaPessoa(servicoAgi({ bilhete: "0000000001" }), "Aéreo", "LOC001")).toBeNull();
});
