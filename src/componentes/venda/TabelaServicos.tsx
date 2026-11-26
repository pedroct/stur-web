"use client";

import type { ReactNode } from "react";
import { Cabeca, CELULA, FOCO } from "@/componentes/comum/tabela";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import type { ContaServico, ServicoAgi, VendaConsultada } from "@/contrato/tipos";
import type { Classificacao } from "@/lib/consulta/consulta";
import { ehDecimal, ehZero } from "@/lib/decimal";
import { formatarData, formatarValor } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { preenchido } from "@/lib/venda/campos";
import { camposSemMolde } from "@/lib/venda/moldes";
import type { NivelDeTitulo } from "./GrupoDeCampos";
import { usePainel } from "./painel-contexto";
import { RestoDoGrupo, SecaoDoProduto, texto } from "./produto-comum";

type Linha = {
  s: ServicoAgi;
  /** A posição do serviço na venda, a partir de 1 (o `k` do endereço do painel). */
  k: number;
  conta: ContaServico | undefined;
  pessoa: string | null;
  abrir: (() => void) | null;
};

type Coluna = { rotulo: string; direita?: boolean; celula: (linha: Linha) => ReactNode };

const BOTAO = cn(
  FOCO,
  "inline-flex min-h-alvo items-center text-left font-semibold underline underline-offset-2 hover:text-acao-primaria",
);

function dinheiro(valor: string | undefined): string {
  return valor !== undefined && ehDecimal(valor) ? formatarValor(valor) : "—";
}

function data(valor: string | null | undefined, caminho: string): string {
  return preenchido(valor, caminho) && valor ? formatarData(valor) : "";
}

function Botao({
  linha,
  texto: rotulo,
  nome,
}: Readonly<{ linha: Linha; texto: string; nome: string }>) {
  if (linha.abrir === null) return rotulo;
  return (
    <button type="button" aria-label={nome} onClick={linha.abrir} className={BOTAO}>
      {rotulo}
    </button>
  );
}

/** A pessoa que abre o painel: o nome, ou "Serviço k" quando o serviço não tem pessoa. */
function ColunaDaPessoa(rotulo: string): Coluna {
  return {
    rotulo,
    celula: (linha) => (
      <Botao
        linha={linha}
        texto={linha.pessoa ?? `Serviço ${linha.k}`}
        nome={linha.pessoa === null ? `Serviço ${linha.k}` : `Serviço ${linha.k}, ${linha.pessoa}`}
      />
    ),
  };
}

function ColunaDeTexto(rotulo: string, ler: (s: ServicoAgi) => string): Coluna {
  return { rotulo, celula: ({ s }) => ler(s) };
}

const COLUNAS_DO_PASSAGEIRO: Coluna[] = [
  ColunaDaPessoa("Passageiro"),
  ColunaDeTexto("Tipo", (s) => texto(s.descricaoSiglaTipoPax) ?? ""),
  ColunaDeTexto("Bilhete", (s) => texto(s.bilhete) ?? ""),
];

const COLUNAS_DO_MEIO: Partial<Record<Classificacao, Coluna[]>> = {
  aereo: COLUNAS_DO_PASSAGEIRO,
  rodoviario: COLUNAS_DO_PASSAGEIRO,
  hotelaria: [
    ColunaDaPessoa("Hóspede"),
    ColunaDeTexto("Entrada", (s) => data(s.dtEntrada, "detalheItem[].dtEntrada")),
    ColunaDeTexto("Saída", (s) => data(s.dtSaida, "detalheItem[].dtSaida")),
    ColunaDeTexto("Apartamentos", (s) =>
      (s.apartamentos ?? [])
        .map((a) =>
          [a.qtde, texto(a.tipoApartamento)].filter((p) => p !== null && p !== undefined).join(" "),
        )
        .filter((a) => a !== "")
        .join(" · "),
    ),
    ColunaDeTexto("Nº Confirmação", (s) => texto(s.numerodeconfirmacao) ?? ""),
  ],
  locacao: [
    ColunaDaPessoa("Condutor"),
    ColunaDeTexto("Veículo", (s) => texto(s.veiculo) ?? ""),
    ColunaDeTexto("Retirada", (s) => data(s.dtRetirada, "detalheItem[].dtRetirada")),
    ColunaDeTexto("Devolução", (s) => data(s.dtDevolucao, "detalheItem[].dtDevolucao")),
    ColunaDeTexto("Nº Confirmação", (s) => texto(s.numerodeconfirmacao) ?? ""),
  ],
};

/** Sem valor em nenhum lado da conta: o serviço fica na tabela com 0,00 e uma frase. */
function semValor(conta: ContaServico | undefined): boolean {
  if (conta === undefined) return false;
  return [conta.cliente.total, conta.fornecedor.total, conta.margem].every(
    (v) => ehDecimal(v) && ehZero(v),
  );
}

function Descricao({ linha }: Readonly<{ linha: Linha }>) {
  const { s, k, pessoa, conta } = linha;
  const descricao = texto(s.descricao);
  const nome = descricao ?? `Serviço ${k}`;
  const segunda = [
    pessoa,
    texto(s.numeroOS),
    texto(s.numerodeconfirmacao) === null ? null : `confirmação ${texto(s.numerodeconfirmacao)}`,
    semValor(conta) ? "sem valor neste serviço" : null,
  ]
    .filter((p) => p !== null)
    .join(" · ");
  return (
    <>
      <Botao linha={linha} texto={nome} nome={pessoa === null ? nome : `${nome}, ${pessoa}`} />
      {segunda !== "" && <div className="text-[13px] leading-5 text-texto-auxiliar">{segunda}</div>}
    </>
  );
}

const COLUNAS_DOS_ITENS: Coluna[] = [
  ColunaDeTexto("Dt. Início", (s) => data(s.dtInicio, "detalheItem[].dtInicio")),
  ColunaDeTexto("Dt. Término", (s) => data(s.dtTermino, "detalheItem[].dtTermino")),
  { rotulo: "Descrição", celula: (linha) => <Descricao linha={linha} /> },
  {
    rotulo: "Qtde",
    direita: true,
    celula: ({ s }) => (preenchido(s.qtde) ? String(s.qtde) : ""),
  },
];

const COLUNAS_DOS_VALORES: Coluna[] = [
  { rotulo: "Cliente (R$)", direita: true, celula: ({ conta }) => dinheiro(conta?.cliente.total) },
  { rotulo: "Custo (R$)", direita: true, celula: ({ conta }) => dinheiro(conta?.fornecedor.total) },
  { rotulo: "Receita (R$)", direita: true, celula: ({ conta }) => dinheiro(conta?.margem) },
];

function Observacao({ linhas }: Readonly<{ linhas: Linha[] }>) {
  const comNota = linhas.filter((l) => texto(l.s.observacao) !== null);
  const [unica] = comNota;
  if (comNota.length !== 1 || unica === undefined) return null;
  return (
    <div className="mt-4 rounded-medio bg-superficie-sutil px-4 py-3">
      <p className="text-xs leading-4 font-semibold tracking-[0.02em] text-texto-auxiliar">
        Observação do serviço{unica.pessoa === null ? "" : ` de ${unica.pessoa}`}
      </p>
      <p className="mt-1 text-sm leading-5 whitespace-pre-line">{texto(unica.s.observacao)}</p>
    </div>
  );
}

/**
 * A tabela dos serviços da venda (IA 6.6 e 8; telas 10 e 18): Diversos e Pacote, sempre, com a
 * descrição como botão do painel quando há mais de um serviço; as outras classes, quando há mais
 * de um, com a pessoa como botão. O rodapé soma os serviços e, quando a conta não fecha, traz o
 * total da API.
 */
export function TabelaServicos({
  dados,
  classificacao,
  nivelBase,
}: Readonly<{ dados: VendaConsultada; classificacao: Classificacao; nivelBase: 1 | 2 }>) {
  const { venda, calculos } = dados;
  const painel = usePainel();
  const servicos = venda.detalheItem ?? [];
  const itens = classificacao === "diversos" || classificacao === "pacote";
  const idreserva = venda.idreserva;
  const painelDeServicos = servicos.length > 1 && idreserva !== null && idreserva !== undefined;

  const linhas: Linha[] = servicos.map((s, i) => ({
    s,
    k: i + 1,
    conta: calculos.servicos.find((c) => c.indice === i),
    pessoa: texto(s.nomePaxCompleto) ?? texto(s.nomePax),
    abrir: painelDeServicos ? () => painel.abrirServico(idreserva, i + 1) : null,
  }));
  const colunas = [
    ...(itens ? COLUNAS_DOS_ITENS : (COLUNAS_DO_MEIO[classificacao] ?? [])),
    ...COLUNAS_DOS_VALORES,
  ];
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  const { totaisServicos: totais, verificacao } = calculos;
  const sobra = colunas.length - COLUNAS_DOS_VALORES.length;

  return (
    <SecaoDoProduto titulo="Serviços" nivelBase={nivelBase}>
      <div className="mt-4 rounded-medio border border-borda">
        <Table className="min-w-[720px]">
          <TableCaption className="sr-only">Serviços da venda, valores em reais</TableCaption>
          <TableHeader>
            <TableRow className="border-borda hover:bg-transparent">
              {colunas.map((c) => (
                <Cabeca key={c.rotulo} className={c.direita ? "text-right" : undefined}>
                  {c.rotulo}
                </Cabeca>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="tabular-nums">
            {linhas.map((linha) => (
              <TableRow key={linha.k} className="border-borda hover:bg-transparent">
                {colunas.map((c) => (
                  <TableCell key={c.rotulo} className={cn(CELULA, c.direita && "text-right")}>
                    {c.celula(linha)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="bg-superficie-sutil tabular-nums">
            <TableRow className="border-borda hover:bg-transparent">
              <TableCell colSpan={sobra} className={cn(CELULA, "font-semibold")}>
                Total dos {servicos.length} serviços
              </TableCell>
              <TableCell className={cn(CELULA, "text-right")}>{dinheiro(totais.cliente)}</TableCell>
              <TableCell className={cn(CELULA, "text-right")}>
                {dinheiro(totais.fornecedor)}
              </TableCell>
              <TableCell className={cn(CELULA, "text-right")}>{dinheiro(totais.margem)}</TableCell>
            </TableRow>
            {!verificacao.fecha && (
              <TableRow className="border-borda hover:bg-transparent">
                <TableCell colSpan={sobra} className={cn(CELULA, "font-semibold")}>
                  Total da API
                </TableCell>
                <TableCell className={cn(CELULA, "text-right")}>
                  {dinheiro(venda.totalCliente ?? undefined)}
                </TableCell>
                <TableCell className={cn(CELULA, "text-right")}>
                  {dinheiro(venda.totalFornecedor ?? undefined)}
                </TableCell>
                <TableCell className={cn(CELULA, "text-right")}>
                  {dinheiro(venda.margemLucroBruta ?? undefined)}
                </TableCell>
              </TableRow>
            )}
          </TableFooter>
        </Table>
      </div>
      <Observacao linhas={linhas} />
      {itens && servicos.length === 1 && (
        <RestoDoGrupo
          grupo="Confirmação do fornecedor"
          campos={camposSemMolde("Confirmação do fornecedor", ["servicos"])}
          venda={venda}
          calculos={calculos}
          indices={[0]}
          nivel={nivel}
        />
      )}
    </SecaoDoProduto>
  );
}
