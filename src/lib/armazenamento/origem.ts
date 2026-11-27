/** Origem da venda aberta (o resultado de onde ela veio), na sessão: o plano 3 lê para o caminho e as setas. */

const CHAVE = "stur-web:origem";

export interface Origem {
  enderecoResultado: string;
  tituloCurto: string;
  vendas: { numero: number; idreserva: number; produto: string | null }[];
}

function ehOrigem(valor: unknown): valor is Origem {
  if (typeof valor !== "object" || valor === null) return false;
  const o = valor as Record<string, unknown>;
  return (
    typeof o.enderecoResultado === "string" &&
    typeof o.tituloCurto === "string" &&
    Array.isArray(o.vendas) &&
    o.vendas.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        typeof v.numero === "number" &&
        typeof v.idreserva === "number" &&
        (v.produto === null || typeof v.produto === "string"),
    )
  );
}

export function registrarOrigem(o: Origem): void {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(o));
  } catch {
    // sem armazenamento, a venda abre sem caminho de volta ao resultado
  }
}

export function lerOrigem(): Origem | null {
  try {
    const guardada: unknown = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "null");
    return ehOrigem(guardada) ? guardada : null;
  } catch {
    return null;
  }
}

/** A busca do topo, o formulário e as recentes apagam a origem: ela só vale vinda do resultado (decisão 28). */
export function apagarOrigem(): void {
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // sem armazenamento, não há origem guardada
  }
}
