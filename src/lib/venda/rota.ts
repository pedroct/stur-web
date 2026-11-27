/**
 * A rota única da reserva (decisão 16): `/reservas/{n}/[[...resto]]`. O `resto` vale `[]`,
 * `["vendas", id]`, `["vendas", id, "servicos", k]` ou `["vendas", id, "dado-cru"]`.
 */

export type Painel = null | { tipo: "servico"; k: number } | { tipo: "dado-cru" };

export type Rota = { tipo: "reserva" } | { tipo: "venda"; idreserva: number; painel: Painel };

function inteiroPositivo(texto: string | undefined): number | null {
  if (texto === undefined || !/^\d{1,15}$/.test(texto)) return null;
  const valor = Number(texto);
  return valor > 0 ? valor : null;
}

/** Outra forma de `resto`, ou um `id`/`k` que não é inteiro positivo, dá `null` (tela 13). */
export function lerResto(resto: string[] | undefined): Rota | null {
  if (resto === undefined || resto.length === 0) return { tipo: "reserva" };
  const [vendas, id, tipo, k] = resto;
  const idreserva = inteiroPositivo(id);
  if (vendas !== "vendas" || idreserva === null || resto.length > 4) return null;
  if (resto.length === 2) return { tipo: "venda", idreserva, painel: null };
  if (resto.length === 3 && tipo === "dado-cru") {
    return { tipo: "venda", idreserva, painel: { tipo: "dado-cru" } };
  }
  const servico = inteiroPositivo(k);
  if (resto.length === 4 && tipo === "servicos" && servico !== null) {
    return { tipo: "venda", idreserva, painel: { tipo: "servico", k: servico } };
  }
  return null;
}

/** O segmento da rota chega codificado; texto que não decodifica fica como veio. */
export function numeroDaRota(segmento: string | undefined): string {
  try {
    return decodeURIComponent(segmento ?? "");
  } catch {
    return segmento ?? "";
  }
}

export function enderecoDaReserva(n: number): string {
  return `/reservas/${n}`;
}

export function enderecoDaVenda(n: number, id: number): string {
  return `${enderecoDaReserva(n)}/vendas/${id}`;
}

export function enderecoDoServico(n: number, id: number, k: number): string {
  return `${enderecoDaVenda(n, id)}/servicos/${k}`;
}

/** Com `q`, a busca do JSON vai no endereço (`?q=`). */
export function enderecoDoDadoCru(n: number, id: number, q?: string): string {
  const busca = q ? `?${new URLSearchParams({ q })}` : "";
  return `${enderecoDaVenda(n, id)}/dado-cru${busca}`;
}
