import {
  enderecoDaReserva,
  enderecoDaVenda,
  enderecoDoDadoCru,
  enderecoDoServico,
  lerResto,
  numeroDaRota,
} from "@/lib/venda/rota";

test("sem resto é a reserva", () => {
  expect(lerResto(undefined)).toEqual({ tipo: "reserva" });
  expect(lerResto([])).toEqual({ tipo: "reserva" });
});

test("a venda, o serviço e o dado cru", () => {
  expect(lerResto(["vendas", "1001"])).toEqual({ tipo: "venda", idreserva: 1001, painel: null });
  expect(lerResto(["vendas", "1001", "servicos", "2"])).toEqual({
    tipo: "venda",
    idreserva: 1001,
    painel: { tipo: "servico", k: 2 },
  });
  expect(lerResto(["vendas", "1001", "dado-cru"])).toEqual({
    tipo: "venda",
    idreserva: 1001,
    painel: { tipo: "dado-cru" },
  });
});

test("id ou k que não é inteiro positivo dá null", () => {
  for (const id of ["0", "-1", "1.5", "abc", "1e3", "", " 1"]) {
    expect(lerResto(["vendas", id])).toBeNull();
    expect(lerResto(["vendas", "1001", "servicos", id])).toBeNull();
  }
});

test("outra forma de resto dá null", () => {
  expect(lerResto(["vendas"])).toBeNull();
  expect(lerResto(["venda", "1001"])).toBeNull();
  expect(lerResto(["vendas", "1001", "servicos"])).toBeNull();
  expect(lerResto(["vendas", "1001", "dado-cru", "x"])).toBeNull();
  expect(lerResto(["vendas", "1001", "servicos", "1", "x"])).toBeNull();
  expect(lerResto(["vendas", "1001", "outro"])).toBeNull();
  expect(lerResto(["servicos", "1"])).toBeNull();
});

test("o número da rota chega codificado; o que não decodifica fica como veio", () => {
  expect(numeroDaRota("90000001")).toBe("90000001");
  expect(numeroDaRota("9000%20x")).toBe("9000 x");
  expect(numeroDaRota("%E0%A4%A")).toBe("%E0%A4%A");
  expect(numeroDaRota(undefined)).toBe("");
});

test("os endereços", () => {
  expect(enderecoDaReserva(90000001)).toBe("/reservas/90000001");
  expect(enderecoDaVenda(90000001, 1001)).toBe("/reservas/90000001/vendas/1001");
  expect(enderecoDoServico(90000001, 1001, 2)).toBe("/reservas/90000001/vendas/1001/servicos/2");
  expect(enderecoDoDadoCru(90000001, 1001)).toBe("/reservas/90000001/vendas/1001/dado-cru");
  expect(enderecoDoDadoCru(90000001, 1001, "")).toBe("/reservas/90000001/vendas/1001/dado-cru");
  expect(enderecoDoDadoCru(90000001, 1001, "vlr Tarifa&x")).toBe(
    "/reservas/90000001/vendas/1001/dado-cru?q=vlr+Tarifa%26x",
  );
});

test("os endereços voltam pela leitura do resto", () => {
  const resto = enderecoDoServico(90000001, 1001, 3).split("/").slice(3);
  expect(lerResto(resto)).toEqual({
    tipo: "venda",
    idreserva: 1001,
    painel: { tipo: "servico", k: 3 },
  });
});
