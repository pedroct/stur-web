import { lerOrigem, registrarOrigem } from "@/lib/armazenamento/origem";

const origem = {
  enderecoResultado: "/consulta?de=2026-11-17&ate=2026-11-24",
  tituloCurto: "Vendas emitidas de 17/11 a 24/11/2026",
  vendas: [
    { numero: 90000001, idreserva: 1001, produto: "BILHETE NACIONAL" },
    { numero: 90000002, idreserva: 1002, produto: null },
  ],
};

test("sem origem registrada, lê null", () => {
  expect(lerOrigem()).toBeNull();
});

test("registra e lê a origem na sessão", () => {
  registrarOrigem(origem);
  expect(lerOrigem()).toEqual(origem);
  expect(sessionStorage.getItem("stur-web:origem")).not.toBeNull();
  expect(localStorage.getItem("stur-web:origem")).toBeNull();
});

test("registrar de novo troca a origem", () => {
  registrarOrigem(origem);
  registrarOrigem({ ...origem, tituloCurto: "Outra" });
  expect(lerOrigem()?.tituloCurto).toBe("Outra");
});

test("conteúdo inválido vale como ausente", () => {
  sessionStorage.setItem("stur-web:origem", "{não é json");
  expect(lerOrigem()).toBeNull();
  sessionStorage.setItem("stur-web:origem", JSON.stringify({ tituloCurto: 1 }));
  expect(lerOrigem()).toBeNull();
});
