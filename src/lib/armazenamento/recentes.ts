import type { VendaDaReserva } from "@/contrato/tipos";
import { somarDias } from "@/lib/consulta/atalhos-periodo";
import { diaEmFortaleza, formatarHora, hojeEmFortaleza } from "@/lib/tempo";

/** Consultas recentes no `localStorage`: só endereço, título, detalhe e quando. */

const CHAVE = "stur-web:recentes";
const MAXIMO = 8;

export interface Recente {
  endereco: string;
  descricao: string;
  detalhe: string;
  quando: string;
}

function ehRecente(valor: unknown): valor is Recente {
  if (typeof valor !== "object" || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.endereco === "string" &&
    typeof r.descricao === "string" &&
    typeof r.detalhe === "string" &&
    typeof r.quando === "string" &&
    !Number.isNaN(Date.parse(r.quando))
  );
}

export function lerRecentes(): Recente[] {
  try {
    const guardado: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(guardado) ? guardado.filter(ehRecente) : [];
  } catch {
    return [];
  }
}

export function registrarRecente(r: Omit<Recente, "quando">, agora: Date): void {
  const recentes = [
    { ...r, quando: agora.toISOString() },
    ...lerRecentes().filter((outra) => outra.endereco !== r.endereco),
  ].slice(0, MAXIMO);
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(recentes));
  } catch {
    // as recentes são um atalho: sem armazenamento, a consulta segue sem elas
  }
}

export function descreverQuando(quando: string, agora: Date): string {
  const segundos = (agora.getTime() - new Date(quando).getTime()) / 1000;
  if (segundos < 60) return "agora";
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;

  const dia = diaEmFortaleza(quando);
  const hoje = hojeEmFortaleza(agora);
  const hora = formatarHora(quando);
  if (dia === hoje) return `hoje, ${hora}`;
  if (dia === somarDias(hoje, -1)) return `ontem, ${hora}`;
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}, ${hora}`;
}

function quantasVendas(quantidade: number): string {
  return quantidade === 1 ? "1 venda" : `${quantidade} vendas`;
}

export function detalheRecenteDoPeriodo(quantidade: number): string {
  return quantasVendas(quantidade);
}

/** Reserva sem vendas não entra nas recentes: esta função não é chamada para ela. */
export function detalheRecenteDaReserva(vendas: VendaDaReserva[]): string {
  const [unica] = vendas;
  if (vendas.length === 1 && unica) return unica.resumo.produto ?? quantasVendas(1);
  return quantasVendas(vendas.length);
}
