"use client";

import { Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Selo, seloDaSituacao } from "@/componentes/comum/Selo";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import type { LinhaResultado, ResultadoConsulta } from "@/contrato/tipos";
import { registrarOrigem } from "@/lib/armazenamento/origem";
import type { Consulta } from "@/lib/consulta/consulta";
import { campoDaData, rotuloDaData, tituloConsulta, tituloCurto } from "@/lib/consulta/descricao";
import { formatarData, formatarDiaMes, formatarValor } from "@/lib/formatacao";
import { cn } from "@/lib/utils";

const CABECALHO = "h-auto px-4 py-2.5 text-xs font-semibold text-texto-auxiliar";
const CELULA = "px-4 py-3 align-top text-sm leading-5 whitespace-normal";
// Duas linhas no máximo, com reticências só depois delas; o nome inteiro segue no texto e no title.
const DUAS_LINHAS = "line-clamp-2 [overflow-wrap:anywhere]";
const FOCO =
  "rounded-pequeno outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

function enderecoDaVenda(linha: LinhaResultado): string {
  return `/reservas/${linha.numero}/vendas/${linha.idreserva}`;
}

/** Fornecedor 2 diferente do 1 (a companhia, o hotel) vem primeiro, com a operadora embaixo. */
function fornecedoresDaLinha(linha: LinhaResultado): {
  principal: string | null;
  operadora: string | null;
} {
  const { fornecedor, fornecedor2 } = linha;
  if (fornecedor2 !== null && fornecedor2 !== fornecedor) {
    return { principal: fornecedor2, operadora: fornecedor };
  }
  return { principal: fornecedor, operadora: null };
}

/** Sem ano quando o período cabe num ano só; com a janela larga ou o ano trocando, sempre com ele. */
function comAno(consulta: Consulta, janelaLarga: boolean): boolean {
  if (janelaLarga || consulta.de === null || consulta.ate === null) return true;
  return consulta.de.slice(0, 4) !== consulta.ate.slice(0, 4);
}

function ProdutoDaLinha({ linha }: { linha: LinhaResultado }) {
  if (linha.tipo !== "fee") return linha.produto;
  const de = linha.fee?.produto ?? null;
  return (
    <>
      {linha.produto}
      <span className="block text-[13px] leading-[18px] text-texto-auxiliar">
        {de === null ? "fee de outra venda da reserva" : `fee de ${de}`}
      </span>
    </>
  );
}

function Linha({
  linha,
  data,
  aoAbrir,
}: {
  linha: LinhaResultado;
  data: string;
  aoAbrir: (linha: LinhaResultado, direto: boolean) => void;
}) {
  const incentivo = linha.tipo === "incentivo";
  const selo = seloDaSituacao(linha.situacao);
  const { principal, operadora } = fornecedoresDaLinha(linha);
  const tituloDoFornecedor =
    principal !== null && operadora !== null
      ? `${principal}, pela ${operadora}`
      : (principal ?? undefined);

  return (
    <TableRow
      className="cursor-pointer border-borda hover:bg-superficie-sutil"
      // O clique na linha é só um atalho para o mouse: o teclado e o leitor de tela usam o link do número.
      onClick={(evento) => {
        if (evento.target instanceof Element && evento.target.closest("a") !== null) return;
        aoAbrir(linha, true);
      }}
    >
      <TableCell className={cn(CELULA, "whitespace-nowrap")}>
        <Link
          href={enderecoDaVenda(linha)}
          onClick={() => aoAbrir(linha, false)}
          className={cn(
            FOCO,
            "font-semibold text-texto-principal underline underline-offset-2 hover:text-acao-primaria",
          )}
        >
          {linha.numero}
        </Link>
        {linha.vendasNoResultado > 1 && (
          <>
            {" "}
            <span className="text-xs text-texto-auxiliar">
              · {linha.vendasNoResultado} vendas aqui
            </span>
          </>
        )}
      </TableCell>
      <TableCell className={cn(CELULA, "w-[150px] max-w-[150px]")}>
        <ProdutoDaLinha linha={linha} />
      </TableCell>
      <TableCell
        className={cn(CELULA, "w-[280px] max-w-[280px]")}
        title={incentivo ? undefined : (linha.cliente ?? undefined)}
      >
        <div className={DUAS_LINHAS}>
          {incentivo ? (
            <>
              <Selo tom="info" icone={Info}>
                Incentivo
              </Selo>{" "}
              <span className="text-texto-auxiliar">sem cliente</span>
            </>
          ) : (
            (linha.cliente ?? "—")
          )}
        </div>
      </TableCell>
      <TableCell className={cn(CELULA, "w-[260px] max-w-[260px]")} title={tituloDoFornecedor}>
        <div className={DUAS_LINHAS}>{principal ?? "—"}</div>
        {operadora !== null && (
          <div className="text-[13px] leading-[18px] text-texto-auxiliar">pela {operadora}</div>
        )}
      </TableCell>
      <TableCell className={CELULA}>{data}</TableCell>
      <TableCell className={CELULA}>
        {selo && (
          <Selo tom={selo.tom} icone={selo.icone} borda={selo.borda}>
            {selo.texto}
          </Selo>
        )}
      </TableCell>
      <TableCell className={cn(CELULA, "text-right")}>
        {incentivo ? (
          <span className="text-texto-auxiliar">
            —<span className="sr-only">sem venda a cliente</span>
          </span>
        ) : (
          formatarValor(linha.totalCliente)
        )}
      </TableCell>
      <TableCell className={cn(CELULA, "text-right")}>
        {formatarValor(linha.margem)}
        {incentivo && <div className="text-xs text-texto-auxiliar">incentivo, fora da margem</div>}
      </TableCell>
      <TableCell className={CELULA}>
        {!linha.contaFecha && (
          <Selo tom="atencao" icone={TriangleAlert}>
            Não fecha
          </Selo>
        )}
      </TableCell>
    </TableRow>
  );
}

function Cabeca({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  "aria-sort"?: "descending";
}) {
  return (
    <TableHead scope="col" className={cn(CABECALHO, className)} {...props}>
      {children}
    </TableHead>
  );
}

/**
 * A página do resultado. `refinadas` são todas as que o refinamento deixou (a origem da venda
 * leva a lista inteira, para as setas e o "venda x de y"); `enderecoAtual` é o endereço com
 * refinamentos e página, para o caminho de volta.
 */
export function TabelaResultado({
  consulta,
  resultado,
  linhas,
  refinadas,
  enderecoAtual,
}: {
  consulta: Consulta;
  resultado: ResultadoConsulta;
  linhas: LinhaResultado[];
  refinadas: LinhaResultado[];
  enderecoAtual: string;
}) {
  const roteador = useRouter();
  const { janelaLarga } = resultado.consulta;
  const tipo = consulta.tipoData;
  const rotulo = janelaLarga ? "Emissão" : rotuloDaData(tipo);
  const campo = janelaLarga ? "dataEmissao" : campoDaData(tipo);
  const formatar = comAno(consulta, janelaLarga) ? formatarData : formatarDiaMes;
  const reserva = resultado.consulta.reserva ?? consulta.reserva;
  const legenda =
    janelaLarga && reserva !== null
      ? `Reserva ${reserva}, na ordem de lançamento das vendas`
      : `${tituloConsulta(consulta)}, da ${rotulo.toLowerCase()} mais recente para a mais antiga`;

  function abrir(linha: LinhaResultado, navegar: boolean) {
    registrarOrigem({
      enderecoResultado: enderecoAtual,
      tituloCurto: tituloCurto(consulta),
      vendas: refinadas.map(({ numero, idreserva, produto }) => ({ numero, idreserva, produto })),
    });
    if (navegar) roteador.push(enderecoDaVenda(linha));
  }

  return (
    <div className="rounded-medio border border-borda">
      <Table className="min-w-[1140px]">
        <TableCaption className="sr-only">{legenda}</TableCaption>
        <TableHeader>
          <TableRow className="border-borda hover:bg-transparent">
            <Cabeca>Reserva</Cabeca>
            <Cabeca>Produto</Cabeca>
            <Cabeca>Cliente</Cabeca>
            <Cabeca>Fornecedor</Cabeca>
            {janelaLarga ? (
              <Cabeca>{rotulo}</Cabeca>
            ) : (
              <Cabeca aria-sort="descending">
                {rotulo} <span aria-hidden="true">↓</span>
              </Cabeca>
            )}
            <Cabeca>Situação</Cabeca>
            <Cabeca className="text-right">Total cliente (R$)</Cabeca>
            <Cabeca className="text-right">Margem (R$)</Cabeca>
            <Cabeca>Conta</Cabeca>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {linhas.map((linha) => (
            <Linha
              key={`${linha.numero}-${linha.idreserva}`}
              linha={linha}
              data={formatar(linha[campo])}
              aoAbrir={abrir}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
