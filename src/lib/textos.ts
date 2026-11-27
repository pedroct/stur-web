/** Texto da AGI comparado sem depender de acento, caixa ou espaço repetido (igual ao `dominio/textos.py` do backend). */

export function normalizar(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * `busca` aparece em `texto`, sem depender de acento nem de caixa. Busca vazia (ou só com
 * espaços) não filtra nada; texto ausente com busca não contém.
 */
export function contem(texto: string | null, busca: string): boolean {
  const procurado = normalizar(busca);
  if (procurado === "") return true;
  if (texto === null) return false;
  return normalizar(texto).includes(procurado);
}

/**
 * Ordem do `sort()` sem função (unidade de código a unidade de código), explícita: serve às datas
 * ISO (`AAAA-MM-DD…`), em que a ordem do texto é a do tempo.
 */
export function compararTexto(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
