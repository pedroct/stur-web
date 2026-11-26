"use client";

import { Braces, Copy, Download, RotateCw, TriangleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Esqueleto } from "@/componentes/comum/Esqueleto";
import { Painel } from "@/componentes/comum/Painel";
import { Button } from "@/componentes/ui/button";
import { useParametros } from "@/lib/api/parametros";
import { comTentarDeNovo, textosDoErro } from "@/lib/api/textos-erro";
import { useCopiado } from "@/lib/copiar";
import { formatarHora } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import {
  ACHADOS_MOSTRADOS,
  buscarNoJson,
  type LinhaJson,
  linhasDoJson,
  tamanhoEmKb,
} from "@/lib/venda/dado-cru";
import { enderecoDoDadoCru } from "@/lib/venda/rota";
import { CLASSE_DO_CONTROLE } from "../comum/controle";
import { tituloDaVenda, usePainel } from "./painel-contexto";
import type { DadoCru } from "./useReservaVenda";

const COR_DO_VALOR: Record<LinhaJson["tipo"], string> = {
  texto: "text-estado-sucesso",
  numero: "text-estado-atencao",
  literal: "text-texto-auxiliar",
  outro: "",
};

const BOTAO = "border-borda-controle";

/** O botão do cabeçalho da venda e do painel do serviço; quem o usa diz como abre (decisão 20). */
export function VerDadoCru({ aoClicar }: Readonly<{ aoClicar: () => void }>) {
  return (
    <Button variant="secundaria" size="compacto" className={BOTAO} onClick={aoClicar}>
      <Braces className="size-[18px]" aria-hidden="true" />
      Ver dado cru
    </Button>
  );
}

function idDaLinha(n: number): string {
  return `dado-cru-l${n}`;
}

function Linha({ linha, achada }: Readonly<{ linha: LinhaJson; achada: boolean }>) {
  return (
    <div
      id={idDaLinha(linha.n)}
      data-linha
      className={cn("flex pr-4", achada && "bg-estado-atencao-fundo")}
    >
      <span
        aria-hidden="true"
        className="w-12 flex-none pr-4 text-right text-texto-auxiliar select-none"
      >
        {linha.n}
      </span>
      <span className="whitespace-pre">
        <span>{linha.recuo}</span>
        <span className="text-estado-info">{linha.chave}</span>
        <span>{linha.separador}</span>
        <span className={COR_DO_VALOR[linha.tipo]}>{linha.valor}</span>
        <span>{linha.fim}</span>
      </span>
    </div>
  );
}

function baixar(texto: string, nome: string): void {
  const endereco = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  const ancora = document.createElement("a");
  ancora.href = endereco;
  ancora.download = nome;
  ancora.click();
  URL.revokeObjectURL(endereco);
}

function irParaLinha(n: number): void {
  document.getElementById(idDaLinha(n))?.scrollIntoView({ block: "center" });
}

function Erro({
  erro,
  aoTentar,
}: Readonly<{ erro: NonNullable<DadoCru["erro"]>; aoTentar: () => void }>) {
  const { tempoLimiteSegundos } = useParametros();
  const textos = textosDoErro(erro.tipo);
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-4 rounded-medio bg-estado-erro-fundo p-6 text-texto-principal"
    >
      <TriangleAlert className="size-7 shrink-0 text-estado-erro" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-xl leading-7 font-bold">{textos.titulo}</h3>
        <p className="mt-2 text-base leading-6">
          {`O dado cru desta venda não carregou: ${textos.frase(tempoLimiteSegundos)}`}
        </p>
        {comTentarDeNovo(erro.tipo) && (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={aoTentar}>
              <RotateCw className="size-[18px]" aria-hidden="true" />
              Tentar de novo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Carregando() {
  return (
    <div role="status" className="mt-6 space-y-3">
      <span className="sr-only">Carregando o dado cru da venda</span>
      <Esqueleto largura="100%" altura={44} />
      <Esqueleto largura="100%" altura={320} />
    </div>
  );
}

function Json({
  texto,
  numero,
  idreserva,
}: Readonly<{ texto: string; numero: number; idreserva: number }>) {
  const roteador = useRouter();
  const parametros = useSearchParams();
  // Começa com o `?q=` do endereço; depois quem manda é o campo, que grava no endereço.
  const [q, setQ] = useState(() => parametros.get("q") ?? "");
  const { copiado, falhou, copiar } = useCopiado();
  const linhas = useMemo(() => linhasDoJson(texto), [texto]);
  const { achadas, resumo } = useMemo(() => buscarNoJson(linhas, q), [linhas, q]);
  const marcadas = useMemo(() => new Set(achadas), [achadas]);

  let rotulo = "Copiar tudo";
  if (copiado) rotulo = "Copiado";
  else if (falhou) rotulo = "Não foi possível copiar";

  function buscar(novo: string) {
    setQ(novo);
    roteador.replace(enderecoDoDadoCru(numero, idreserva, novo), { scroll: false });
  }

  return (
    <>
      <p className="mt-0.5 text-[13px] leading-5 text-texto-auxiliar tabular-nums">
        {linhas.length} {linhas.length === 1 ? "linha" : "linhas"} · {tamanhoEmKb(texto)} · chaves
        na ordem da API
      </p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
          <label htmlFor="dado-cru-busca" className="text-sm font-semibold">
            Buscar no JSON
          </label>
          <input
            id="dado-cru-busca"
            type="search"
            autoComplete="off"
            placeholder="Nome do campo ou valor"
            value={q}
            onChange={(e) => buscar(e.target.value)}
            className={cn(CLASSE_DO_CONTROLE, "w-full")}
          />
        </div>
        <Button
          variant="secundaria"
          size="compacto"
          className={BOTAO}
          onClick={() => copiar(texto)}
        >
          <Copy className="size-[18px]" aria-hidden="true" />
          {rotulo}
        </Button>
        <Button
          variant="secundaria"
          size="compacto"
          className={BOTAO}
          onClick={() => baixar(texto, `venda-${numero}-${idreserva}.json`)}
        >
          <Download className="size-[18px]" aria-hidden="true" />
          Baixar .json
        </Button>
      </div>
      <div
        aria-live="polite"
        className="mt-2.5 flex min-h-5 flex-wrap items-baseline gap-x-2 text-[13px] leading-5 text-texto-auxiliar tabular-nums"
      >
        {resumo !== "" && <span>{resumo}</span>}
        {achadas.slice(0, ACHADOS_MOSTRADOS).map((n) => (
          <a
            key={n}
            href={`#${idDaLinha(n)}`}
            className="text-acao-primaria underline underline-offset-4 outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            onClick={(e) => {
              e.preventDefault();
              irParaLinha(n);
            }}
          >
            linha {n}
          </a>
        ))}
      </div>
      <section
        aria-label="JSON da venda"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a região rola, e o teclado precisa chegar nela
        tabIndex={0}
        className="mt-3 max-h-[70vh] overflow-auto rounded-grande border border-borda bg-superficie-sutil py-3 font-mono text-[13px] leading-5 outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        {linhas.map((l) => (
          <Linha key={l.n} linha={l} achada={marcadas.has(l.n)} />
        ))}
      </section>
    </>
  );
}

/**
 * O dado cru da venda (tela 3b; IA 7.5): o JSON como a API do Stur devolveu, com busca que grava
 * em `?q=`, copiar tudo e baixar. O texto vem do layout (`EstadoVenda.dadoCru`), pedido uma vez
 * por venda; Fechar e Esc seguem a decisão 20.
 */
export function PainelDadoCru({
  numero,
  idreserva,
  dadoCru,
  aoTentar,
}: Readonly<{
  numero: number;
  idreserva: number;
  dadoCru: DadoCru | undefined;
  aoTentar: () => void;
}>) {
  const painel = usePainel();
  const pronto = dadoCru?.estado === "pronto" && dadoCru.texto !== undefined;
  const subtitulo =
    pronto && dadoCru.chegouEm !== undefined
      ? `Reserva ${numero} · como a API do Stur devolveu, consultado às ${formatarHora(dadoCru.chegouEm)}`
      : `Reserva ${numero}`;

  let corpo = <Carregando />;
  if (pronto) corpo = <Json texto={dadoCru.texto ?? ""} numero={numero} idreserva={idreserva} />;
  else if (dadoCru?.estado === "erro" && dadoCru.erro) {
    corpo = <Erro erro={dadoCru.erro} aoTentar={aoTentar} />;
  }

  return (
    <Painel
      titulo="Dado cru da venda"
      subtitulo={subtitulo}
      aberto
      aoFechar={painel.fecharPainel}
      largura={800}
      focoSemAbridor={tituloDaVenda}
    >
      {corpo}
    </Painel>
  );
}
