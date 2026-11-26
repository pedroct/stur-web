import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import type { LancamentoCalculado, PagamentoAgi, VendaConsultada } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { ehDecimal } from "@/lib/decimal";
import { formatarData, formatarMoeda, formatarPercentual, formatarValor } from "@/lib/formatacao";
import { diaEmFortaleza } from "@/lib/tempo";
import { CAMPOS_ANEXO_B, type Formato } from "@/lib/venda/anexo-b";
import { preenchido, valorDoCampo } from "@/lib/venda/campos";
import {
  fraseSemLancamentos,
  seloDoLancamento,
  textoDoLancamento,
  textoDosDocumentos,
} from "@/lib/venda/lancamentos";
import { camposSemMolde, DATAS_E_NOME_NO_SERVICO } from "@/lib/venda/moldes";
import { formatarCampo, GrupoDeCampos, type NivelDeTitulo } from "./GrupoDeCampos";
import { RestoDoGrupo } from "./produto-comum";

function texto(valor: string | null | undefined): string | null {
  return valor !== null && valor !== undefined && valor.trim() !== "" ? valor.trim() : null;
}

/** Dinheiro em texto decimal, sem "R$" (como nas contas); o que não for decimal, como veio. */
function numero(valor: string | null | undefined): string {
  if (!preenchido(valor) || valor === null || valor === undefined) return "—";
  return ehDecimal(valor) ? formatarValor(valor) : valor;
}

function reais(valor: string | null | undefined): string {
  if (!preenchido(valor) || valor === null || valor === undefined) return "—";
  return ehDecimal(valor) ? formatarMoeda(valor) : valor;
}

function Cartao({ rotulo, children }: Readonly<{ rotulo: string; children: ReactNode }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs leading-4 font-semibold tracking-[0.02em] text-texto-auxiliar">
        {rotulo}
      </p>
      {children}
    </div>
  );
}

const DESTAQUE = "mt-0.5 text-[22px] leading-7 font-semibold tabular-nums";
const APOIO = "mt-1 text-[13px] leading-[22px] text-texto-auxiliar";

/** O crédito do fornecedor; sem ele, o primeiro pagamento (decisão 18). */
function lancamentoDoRecebimento(
  dados: VendaConsultada,
): { l: LancamentoCalculado; cru: PagamentoAgi } | null {
  const { pagamentos } = dados.calculos;
  const l = pagamentos.find((p) => p.ehCredito) ?? pagamentos[0];
  const cru = l === undefined ? undefined : dados.venda.pagamentos?.[l.indice];
  return l === undefined || cru === undefined ? null : { l, cru };
}

function Recebimento({ dados, hoje }: Readonly<{ dados: VendaConsultada; hoje: string }>) {
  const { venda } = dados;
  const alvo = lancamentoDoRecebimento(dados);
  if (alvo === null) {
    return <p className={APOIO}>{fraseSemLancamentos("fornecedor")}</p>;
  }
  const { l, cru } = alvo;
  const selo = dadosDoSeloTexto(seloDoLancamento(l, "fornecedor", hoje));
  const fornecedor = texto(venda.nomefornec);
  const documentos = textoDosDocumentos(l.documentos);
  const descricao = l.ehCredito
    ? [`crédito com ${fornecedor ?? "o fornecedor"}`, documentos].filter((p) => p !== "").join(", ")
    : textoDoLancamento(l, cru, false, fornecedor, hoje);
  return (
    <>
      <p className={DESTAQUE}>{reais(cru.valor)}</p>
      <p className={APOIO}>
        <Selo {...selo} borda={selo.borda || selo.tom === "neutro"}>
          {selo.texto}
        </Selo>{" "}
        {descricao}
      </p>
    </>
  );
}

function Linha({
  rotulo,
  valor,
  children,
}: Readonly<{ rotulo: string; valor: string; children: ReactNode }>) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 border-b border-borda py-2.5 min-[700px]:grid-cols-[minmax(11rem,15rem)_8rem_1fr] min-[700px]:items-baseline">
      <dt>{rotulo}</dt>
      <dd className="min-[700px]:text-right">{valor}</dd>
      <dd className="text-texto-auxiliar">{children}</dd>
    </div>
  );
}

/** "Como o Stur registra": os totais da API e o crédito, com a conta que fecha (tela 17). */
function ComoOSturRegistra({ dados }: Readonly<{ dados: VendaConsultada }>) {
  const { venda, calculos } = dados;
  const alvo = lancamentoDoRecebimento(dados);
  const percentual = formatarPercentual(calculos.percentualLucro);
  const vencimento =
    alvo !== null && preenchido(alvo.l.vencimento, "vencimento") && alvo.l.vencimento !== null
      ? formatarData(alvo.l.vencimento)
      : null;
  return (
    <details
      open
      data-anexo-secao="2"
      className="mt-10 rounded-grande border border-borda px-5 py-4"
    >
      <summary className="min-h-alvo cursor-pointer text-base font-semibold">
        Como o Stur registra
      </summary>
      <dl className="mt-2 text-sm leading-5 tabular-nums">
        <Linha rotulo="Total do cliente" valor={numero(venda.totalCliente)}>
          não há venda a cliente
        </Linha>
        <Linha rotulo="Total do fornecedor" valor={numero(venda.totalFornecedor)}>
          acordo com o fornecedor, que vira receita
        </Linha>
        <Linha rotulo="Margem" valor={numero(venda.margemLucroBruta)}>
          {percentual === null ? "% de lucro: não se aplica" : `${percentual} de lucro`}
        </Linha>
        {alvo?.l.ehCredito && (
          <Linha rotulo="Crédito a receber do fornecedor" valor={numero(alvo.cru.valor)}>
            no Stur, aparece em pagamentos ao fornecedor, com sinal negativo
            {vencimento === null ? "" : `; vencimento ${vencimento}`}
          </Linha>
        )}
      </dl>
      {calculos.verificacao.fecha && (
        <p className="mt-3 flex items-center gap-2 text-sm leading-5">
          <Check className="size-4 shrink-0 text-estado-sucesso" aria-hidden="true" />
          <span>
            A conta fecha com os totais da API do Stur: o total do fornecedor é o acordo com sinal
            negativo.
          </span>
        </p>
      )}
    </details>
  );
}

/** Os pares do serviço lançado: o rótulo da tela, o campo do Anexo B e a seção dele. */
const PARES_DO_SERVICO: {
  caminho: string;
  rotulo: string;
  formato: Formato;
  secao: 3 | 5;
  mono?: boolean;
}[] = [
  {
    caminho: "detalheItem[].descricao",
    rotulo: "Descrição",
    formato: "texto",
    secao: 3,
    mono: true,
  },
  { caminho: "detalheItem[].observacao", rotulo: "Observação", formato: "texto", secao: 5 },
  {
    caminho: "detalheItem[].vlrTarifaTotalp",
    rotulo: "Acordo com o fornecedor",
    formato: "dinheiro",
    secao: 5,
  },
  {
    caminho: "detalheItem[].numeroOS",
    rotulo: "Ordem de serviço",
    formato: "texto",
    secao: 3,
    mono: true,
  },
];

/** Os grupos do serviço (seções 3 a 5), com a seção de cada um, para o que o molde não mostra. */
const GRUPOS_DO_SERVICO: [string, number][] = [
  ...new Map(
    CAMPOS_ANEXO_B.filter(
      (c) => c.secao >= 3 && c.secao <= 5 && c.caminho.startsWith("detalheItem[]."),
    ).map((c): [string, number] => [c.grupo, c.secao]),
  ),
];

function ServicoLancado({
  dados,
  nivelBase,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2 }>) {
  const { venda, calculos } = dados;
  if ((venda.detalheItem ?? []).length === 0) return null;
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  const pares = PARES_DO_SERVICO.flatMap((par) => {
    const valor = valorDoCampo(venda, par.caminho, [0]);
    return preenchido(valor, par.caminho) ? [{ ...par, texto: formatarCampo(par, valor) }] : [];
  });
  const comuns = { venda, calculos, indices: [0], nivel };
  const datasENome = CAMPOS_ANEXO_B.filter((c) => DATAS_E_NOME_NO_SERVICO.includes(c.caminho));

  return (
    <section className="mt-6">
      <Titulo className="text-xl leading-7 font-semibold">Serviço lançado</Titulo>
      <div className="mt-3 rounded-grande border border-borda px-5 py-4 text-sm leading-5">
        <dl className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-4 gap-y-2">
          {pares.map((par) => (
            <div key={par.caminho} className="contents" data-anexo-secao={par.secao}>
              <dt className="text-texto-auxiliar">{par.rotulo}</dt>
              <dd
                className={
                  par.mono ? "font-mono text-[13px] break-words" : "tabular-nums break-words"
                }
              >
                {par.texto}
              </dd>
            </div>
          ))}
        </dl>
        {GRUPOS_DO_SERVICO.map(([grupo, secao]) => (
          <div key={grupo} data-anexo-secao={secao} className="empty:hidden">
            <RestoDoGrupo
              grupo={grupo}
              campos={camposSemMolde(grupo, ["incentivo"]).filter((c) =>
                c.caminho.startsWith("detalheItem[]."),
              )}
              {...comuns}
            />
          </div>
        ))}
        {/* As datas são da seção 3 e o nome é da 4: a marca de fora vale para o nome. */}
        <div data-anexo-secao="4" className="mt-3 border-t border-borda pt-3 empty:hidden">
          <GrupoDeCampos
            titulo="Datas e nome no serviço"
            campos={datasENome}
            recolhido
            secao={3}
            {...comuns}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * A venda de incentivo (IA 6.2; tela 17), no lugar do Financeiro e da conta: o valor, o
 * recebimento do crédito e a referência no Stur, a conta como o Stur a registra e o serviço
 * lançado. O título é o da seção, só para o leitor de tela, como no Financeiro.
 */
export function Incentivo({
  dados,
  nivelBase = 1,
}: Readonly<{ dados: VendaConsultada; nivelBase?: 1 | 2 }>) {
  const { venda } = dados;
  const hoje = diaEmFortaleza(dados.consultadoEm);
  const cancelada = situacaoDe(venda.status ?? null) === "cancelada";
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  const servico = venda.detalheItem?.[0];
  const descricao = texto(servico?.descricao);
  const observacao = texto(servico?.observacao);
  const comuns = { venda, calculos: dados.calculos, indices: [], nivel };

  return (
    <>
      <section data-anexo-secao="2" className="mt-6">
        <Titulo className="sr-only">Incentivo</Titulo>
        <div className="grid gap-4 rounded-grande bg-superficie-sutil px-5 py-4 min-[1100px]:grid-cols-3">
          <Cartao rotulo="Valor do incentivo">
            <p className={DESTAQUE}>{reais(venda.margemLucroBruta)}</p>
            <p className={APOIO}>receita da A3, sem custo</p>
          </Cartao>
          <Cartao rotulo="Recebimento">
            <Recebimento dados={dados} hoje={hoje} />
          </Cartao>
          <Cartao rotulo="Referência no Stur">
            <p className="mt-0.5 font-mono text-[17px] leading-7 font-semibold break-words">
              {descricao ?? "—"}
            </p>
            {observacao !== null && <p className={APOIO}>{`"${observacao}"`}</p>}
          </Cartao>
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-texto-auxiliar">
          {cancelada
            ? "Situação pelos totais da venda no Stur. O Stur zera o saldo a receber e a pagar da venda cancelada."
            : "Situação pelos totais da venda no Stur. Um valor em aberto pode já ter sido pago sem baixa."}
        </p>
        <RestoDoGrupo
          grupo="Cartões Cliente, Fornecedor e Resultado"
          campos={camposSemMolde("Cartões Cliente, Fornecedor e Resultado", ["incentivo"])}
          {...comuns}
        />
        <GrupoDeCampos
          titulo="Situação no Stur"
          campos={camposSemMolde("Situação no Stur", ["incentivo"])}
          recolhido
          className="mt-2"
          {...comuns}
        />
      </section>
      <ComoOSturRegistra dados={dados} />
      <ServicoLancado dados={dados} nivelBase={nivelBase} />
    </>
  );
}
