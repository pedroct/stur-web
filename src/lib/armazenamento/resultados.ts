import type { ResultadoConsulta } from "@/contrato/tipos";

/** Resultados da consulta no `sessionStorage`: somem ao fechar a aba (decisão 1 do plano 2). */

const PREFIXO = "stur-web:resultado:";
const INDICE = "stur-web:resultados";
const MAXIMO = 3;

/** Quando nem o armazenamento apagado cabe (ou não existe), o resultado fica só na página. */
const naMemoria = new Map<string, ResultadoConsulta>();

function armazem(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Chaves guardadas, da mais antiga para a mais nova. */
function lerIndice(armazenamento: Storage): string[] {
  try {
    const indice: unknown = JSON.parse(armazenamento.getItem(INDICE) ?? "[]");
    return Array.isArray(indice) ? indice.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function gravar(armazenamento: Storage, chave: string, json: string): void {
  armazenamento.setItem(PREFIXO + chave, json);
  const indice = lerIndice(armazenamento).filter((c) => c !== chave);
  indice.push(chave);
  for (const velha of indice.splice(0, Math.max(0, indice.length - MAXIMO))) {
    armazenamento.removeItem(PREFIXO + velha);
  }
  armazenamento.setItem(INDICE, JSON.stringify(indice));
}

function apagarOutros(armazenamento: Storage, chave: string): void {
  for (const outra of lerIndice(armazenamento)) {
    if (outra !== chave) armazenamento.removeItem(PREFIXO + outra);
  }
  armazenamento.removeItem(INDICE);
}

function guardarNaMemoria(chave: string, r: ResultadoConsulta): void {
  naMemoria.delete(chave);
  naMemoria.set(chave, r);
  for (const velha of [...naMemoria.keys()].slice(0, Math.max(0, naMemoria.size - MAXIMO))) {
    naMemoria.delete(velha);
  }
}

/** Guarda o que recebe: quem chama decide que resultado vazio não é guardado. Nunca lança. */
export function guardarResultado(chave: string, r: ResultadoConsulta): void {
  const armazenamento = armazem();
  if (armazenamento) {
    try {
      const json = JSON.stringify(r);
      try {
        gravar(armazenamento, chave, json);
      } catch {
        apagarOutros(armazenamento, chave);
        gravar(armazenamento, chave, json);
      }
      naMemoria.delete(chave);
      return;
    } catch {
      try {
        armazenamento.removeItem(PREFIXO + chave);
      } catch {
        // sem armazenamento utilizável: segue para a memória
      }
    }
  }
  guardarNaMemoria(chave, r);
}

export function lerResultado(chave: string): ResultadoConsulta | null {
  try {
    const json = armazem()?.getItem(PREFIXO + chave);
    if (json) return JSON.parse(json) as ResultadoConsulta;
  } catch {
    // conteúdo ilegível vale como ausente
  }
  return naMemoria.get(chave) ?? null;
}

export function apagarResultado(chave: string): void {
  naMemoria.delete(chave);
  const armazenamento = armazem();
  if (!armazenamento) return;
  try {
    armazenamento.removeItem(PREFIXO + chave);
    armazenamento.setItem(
      INDICE,
      JSON.stringify(lerIndice(armazenamento).filter((c) => c !== chave)),
    );
  } catch {
    // nada a apagar em armazenamento que não responde
  }
}

/** Só para os testes. */
export function zerarResultadosEmMemoria(): void {
  naMemoria.clear();
}
