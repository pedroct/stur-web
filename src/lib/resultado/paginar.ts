/** Paginação do resultado no navegador: a lista inteira já está na memória. */

export interface Pagina<T> {
  itens: T[];
  primeira: number;
  ultima: number;
  total: number;
  paginas: number;
  pagina: number;
}

/** `pagina` do endereço: 1 quando falta, não é número inteiro ou é menor que 1. */
export function lerPagina(p: URLSearchParams): number {
  const texto = p.get("pagina");
  if (texto === null || !/^\d+$/.test(texto)) return 1;
  return Math.max(1, Number(texto));
}

/** Página fora da faixa vai para a última válida; lista vazia tem uma página e `primeira = ultima = 0`. */
export function paginar<T>(lista: T[], pagina: number, porPagina: number): Pagina<T> {
  const total = lista.length;
  const tamanho = Math.max(1, porPagina);
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  const atual = Math.min(Math.max(1, pagina), paginas);
  const inicio = (atual - 1) * tamanho;
  const itens = lista.slice(inicio, inicio + tamanho);
  return {
    itens,
    primeira: total === 0 ? 0 : inicio + 1,
    ultima: inicio + itens.length,
    total,
    paginas,
    pagina: atual,
  };
}
