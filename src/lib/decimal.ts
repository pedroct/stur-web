/** Soma de decimais em texto, exata: BigInt escalado pelo maior número de casas recebido. */

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

/** Texto decimal simples: `-?\d+(\.\d+)?` (sem expoente, sem "+" e sem vírgula). */
export function ehDecimal(texto: string): boolean {
  return DECIMAL.test(texto);
}

function casas(texto: string): number {
  return (DECIMAL.exec(texto)?.[3] ?? "").length;
}

function escalado(texto: string, escala: number): bigint {
  const partes = DECIMAL.exec(texto);
  if (!partes) throw new Error(`Decimal inválido: ${texto}`);
  const [, sinal, inteira, fracao = ""] = partes;
  const valor = BigInt(inteira + fracao.padEnd(escala, "0"));
  return sinal ? -valor : valor;
}

/** `["0.10", "0.20"]` vira `"0.30"`; lista vazia vira `"0.00"`. */
export function somarDecimais(textos: string[]): string {
  if (textos.length === 0) return "0.00";
  const escala = Math.max(...textos.map(casas));
  const soma = textos.reduce((total, texto) => total + escalado(texto, escala), 0n);
  const digitos = (soma < 0n ? -soma : soma).toString().padStart(escala + 1, "0");
  const inteira = digitos.slice(0, digitos.length - escala);
  const fracao = digitos.slice(digitos.length - escala);
  return `${soma < 0n ? "-" : ""}${inteira}${escala > 0 ? `.${fracao}` : ""}`;
}
