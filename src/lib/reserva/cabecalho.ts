/** Textos do topo da reserva com várias vendas (decisão 12): selos, subtítulo e frases de data. */

import type { Reserva, VendaDaReserva } from "@/contrato/tipos";
import { CLASSIFICACOES, classificacaoDe, SITUACOES, situacaoDe } from "@/lib/consulta/consulta";
import { unir } from "@/lib/consulta/descricao";
import { formatarData } from "@/lib/formatacao";
import { normalizar } from "@/lib/textos";
import { preenchido } from "@/lib/venda/campos";
import { listaDeDatas, periodoCurto } from "@/lib/venda/datas";
import { textoDoEstado } from "@/lib/venda/estado";
import type { SeloTexto } from "@/lib/venda/lancamentos";
import { seloTextoDaSituacao } from "@/lib/venda/situacao";

/** As vendas que contam nos totais: tudo que não está cancelado. */
export function ativasDaReserva(r: Reserva): VendaDaReserva[] {
  return r.vendas.filter((v) => situacaoDe(v.resumo.situacao) !== "cancelada");
}

type Grupo = { chave: string; situacao: string; n: number };

function agruparPorSituacao(r: Reserva): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const { resumo } of r.vendas) {
    if (resumo.situacao === null) continue;
    const chave = situacaoDe(resumo.situacao) ?? resumo.situacao.trim().toLowerCase();
    const grupo = grupos.get(chave);
    if (grupo) grupo.n += 1;
    else grupos.set(chave, { chave, situacao: resumo.situacao, n: 1 });
  }
  // `sort` é estável: com a mesma contagem, vale a ordem em que a situação apareceu.
  return [...grupos.values()].sort((a, b) => b.n - a.n);
}

function nomeDaSituacao(situacao: string, plural: boolean): string {
  const conhecida = SITUACOES.find((s) => s.valor === situacaoDe(situacao));
  if (conhecida) return plural ? conhecida.plural : conhecida.rotulo.toLowerCase();
  return situacao.trim().toLowerCase();
}

const ICONE_DO_ESTADO = {
  a_acontecer: "calendario",
  em_andamento: "relogio",
  concluido: "check",
} as const;

function menor(textos: string[]): string | undefined {
  return textos.reduce<string | undefined>((m, t) => (m === undefined || t < m ? t : m), undefined);
}

function maior(textos: string[]): string | undefined {
  return textos.reduce<string | undefined>((m, t) => (m === undefined || t > m ? t : m), undefined);
}

/** Só quando as ativas têm a mesma classificação e o mesmo estado; o período é o somado. */
function seloDoEstado(r: Reserva, hoje: string): SeloTexto | null {
  const ativas = ativasDaReserva(r);
  const primeira = ativas[0];
  const estado = primeira?.estadoServico;
  if (!primeira || !estado) return null;
  const classificacao = normalizar(primeira.resumo.classificacao ?? "");
  const igual = ativas.every(
    (v) =>
      v.estadoServico?.estado === estado.estado &&
      normalizar(v.resumo.classificacao ?? "") === classificacao,
  );
  if (!igual) return null;
  const inicios = ativas.flatMap((v) => (v.estadoServico ? [v.estadoServico.inicio] : []));
  const fins = ativas.flatMap((v) => (v.estadoServico ? [v.estadoServico.fim] : []));
  const texto = textoDoEstado(
    { ...estado, inicio: menor(inicios) ?? estado.inicio, fim: maior(fins) ?? estado.fim },
    primeira.resumo.classificacao,
    primeira.resumo.produto,
    hoje,
  );
  return { tom: "neutro", icone: ICONE_DO_ESTADO[estado.estado], rotulo: texto };
}

/** Um selo por situação, com contagem, e o do estado quando vale (decisão 12). */
export function selosDaReserva(r: Reserva, hoje: string): SeloTexto[] {
  const grupos = agruparPorSituacao(r);
  const selos = grupos.flatMap((g, i) => {
    const base = seloTextoDaSituacao(g.situacao);
    if (base === null) return [];
    const unica = grupos.length === 1;
    const nome = nomeDaSituacao(g.situacao, unica || g.n > 1);
    const rotulo = unica
      ? `${nome.charAt(0).toUpperCase()}${nome.slice(1)} no Stur`
      : `${g.n} ${nome}${i === 0 ? " no Stur" : ""}`;
    return [{ ...base, rotulo }];
  });
  const estado = seloDoEstado(r, hoje);
  return estado === null ? selos : [...selos, estado];
}

/** Os dias de emissão sem repetir, do mais antigo ao mais novo. */
function diasDeEmissao(r: Reserva): string[] {
  const dias = r.vendas.flatMap(({ resumo }) =>
    resumo.dataEmissao !== null && preenchido(resumo.dataEmissao, "dtemissao")
      ? [resumo.dataEmissao.slice(0, 10)]
      : [],
  );
  return [...new Set(dias)].sort();
}

function classificacoesDasAtivas(r: Reserva): string[] {
  const ativas = ativasDaReserva(r);
  const conhecidas = CLASSIFICACOES.filter((c) =>
    ativas.some((v) => classificacaoDe(v.resumo.classificacao) === c.valor),
  ).map((c) => c.rotulo.toLowerCase());
  const outras = ativas.flatMap((v) => {
    const texto = v.resumo.classificacao?.trim();
    return texto && classificacaoDe(texto) === null ? [texto.toLowerCase()] : [];
  });
  return [...new Set([...conhecidas, ...outras])];
}

/** "{n} passageiros · aéreo e hotelaria · centro de custo {X} · emitidas em {data}". */
export function subtituloDaReserva(r: Reserva): string {
  const passageiros = new Set(
    r.vendas.flatMap((v) => v.resumo.passageiros.map((p) => p.trim()).filter((p) => p !== "")),
  );
  const centros = new Set(r.vendas.map((v) => v.centroCusto?.trim() ?? ""));
  const centro = centros.size === 1 ? ([...centros][0] ?? "") : "";
  const classes = classificacoesDasAtivas(r);
  const dias = diasDeEmissao(r);
  return [
    passageiros.size > 1 ? `${passageiros.size} passageiros` : "",
    unir(classes),
    centro === "" ? "" : `centro de custo ${centro}`,
    dias.length === 1 ? `emitidas em ${formatarData(dias[0] ?? null)}` : "",
  ]
    .filter((p) => p !== "")
    .join(" · ");
}

const NUMERO_POR_EXTENSO: Record<number, string> = { 2: "duas", 3: "três" };

/** Duas ou três datas de emissão em lista; mais, de a. Uma data só vai no subtítulo. */
export function fraseDasEmissoes(r: Reserva): string | null {
  const dias = diasDeEmissao(r);
  const vendas = r.vendas.length;
  const extenso = NUMERO_POR_EXTENSO[dias.length];
  if (extenso !== undefined) {
    return `As ${vendas} vendas foram emitidas em ${extenso} datas: ${listaDeDatas(dias)}.`;
  }
  if (dias.length > 3) {
    const periodo = periodoCurto(dias[0] ?? null, dias.at(-1) ?? null);
    return `As ${vendas} vendas foram emitidas em datas diferentes, de ${periodo}.`;
  }
  return null;
}

/** "Serviços de {período}.": o menor início e o maior fim das vendas ativas. */
export function fraseDosServicos(r: Reserva): string | null {
  const servicos = ativasDaReserva(r).flatMap((v) => (v.servico ? [v.servico] : []));
  const lista = (campo: "inicio" | "fim") =>
    servicos.flatMap((s) => {
      const dia = s[campo];
      return dia !== null && preenchido(dia, campo) ? [dia] : [];
    });
  const periodo = periodoCurto(menor(lista("inicio")) ?? null, maior(lista("fim")) ?? null);
  return periodo === null ? null : `Serviços de ${periodo}.`;
}
