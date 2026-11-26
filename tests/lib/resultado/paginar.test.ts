import { lerPagina, paginar } from "@/lib/resultado/paginar";

test.each([
  [1, 20, 1, 20],
  [3, 20, 41, 54],
  [9, 20, 41, 54],
  [1, 100, 1, 54],
])("página %i com %i por página mostra %i–%i de 54", (pagina, por, primeira, ultima) =>
  expect(
    paginar(
      Array.from({ length: 54 }, (_, i) => i),
      pagina,
      por,
    ),
  ).toMatchObject({
    primeira,
    ultima,
    total: 54,
  }));

test("devolve os itens da página, o total de páginas e a página usada", () => {
  const lista = Array.from({ length: 54 }, (_, i) => i);
  const p = paginar(lista, 9, 20);
  expect(p.itens).toEqual(lista.slice(40));
  expect(p).toMatchObject({ paginas: 3, pagina: 3 });
  expect(paginar(lista, 0, 20)).toMatchObject({ pagina: 1, primeira: 1 });
});

test("lista vazia", () =>
  expect(paginar([], 1, 20)).toEqual({
    itens: [],
    primeira: 0,
    ultima: 0,
    total: 0,
    paginas: 1,
    pagina: 1,
  }));

test("página inválida vale 1", () => {
  expect(lerPagina(new URLSearchParams("pagina=0"))).toBe(1);
  expect(lerPagina(new URLSearchParams("pagina=x"))).toBe(1);
  expect(lerPagina(new URLSearchParams("pagina=-2"))).toBe(1);
  expect(lerPagina(new URLSearchParams(""))).toBe(1);
  expect(lerPagina(new URLSearchParams("pagina=3"))).toBe(3);
});

test("porPagina menor que 1 não quebra a conta", () =>
  expect(paginar([1, 2, 3], 1, 0)).toMatchObject({
    paginas: 3,
    itens: [1],
    primeira: 1,
    ultima: 1,
  }));
