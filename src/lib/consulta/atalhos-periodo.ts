/** Atalhos de período do formulário. Datas são texto `aaaa-mm-dd`; `Date.UTC` só soma dias, sem fuso local. */

export type AtalhoPeriodo = "hoje" | "ultimos7" | "esteMes" | "mesPassado";

const DIA_EM_MS = 86_400_000;

/** Ano, mês (1 a 12) e dia de um `aaaa-mm-dd`. */
export function partesDoDia(dia: string): [number, number, number] {
  return [Number(dia.slice(0, 4)), Number(dia.slice(5, 7)), Number(dia.slice(8, 10))];
}

function emUtc(dia: string): number {
  const [ano, mes, d] = partesDoDia(dia);
  return Date.UTC(ano, mes - 1, d);
}

function emTexto(instante: number): string {
  return new Date(instante).toISOString().slice(0, 10);
}

export function somarDias(dia: string, dias: number): string {
  return emTexto(emUtc(dia) + dias * DIA_EM_MS);
}

/** Dias de `de` a `ate` contando as duas pontas, como o backend. */
export function contarDias(de: string, ate: string): number {
  return Math.round((emUtc(ate) - emUtc(de)) / DIA_EM_MS) + 1;
}

export function periodoDoAtalho(atalho: AtalhoPeriodo, hoje: string): { de: string; ate: string } {
  const primeiroDoMes = `${hoje.slice(0, 8)}01`;
  switch (atalho) {
    case "hoje":
      return { de: hoje, ate: hoje };
    case "ultimos7":
      return { de: somarDias(hoje, -6), ate: hoje };
    case "esteMes":
      return { de: primeiroDoMes, ate: hoje };
    case "mesPassado": {
      const ultimo = somarDias(primeiroDoMes, -1);
      return { de: `${ultimo.slice(0, 8)}01`, ate: ultimo };
    }
  }
}
