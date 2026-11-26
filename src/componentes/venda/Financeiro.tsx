import { Fragment, type ReactNode } from "react";
import { Aviso } from "@/componentes/comum/Aviso";
import type { VendaConsultada } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { diaEmFortaleza } from "@/lib/tempo";
import { fraseDaReceita } from "@/lib/venda/cabecalho";
import { preenchido } from "@/lib/venda/campos";
import { camposSemMolde } from "@/lib/venda/moldes";
import { CartaoLancamentos } from "./CartaoLancamentos";
import { GrupoDeCampos, type NivelDeTitulo } from "./GrupoDeCampos";

const ROTULO_DA_CONTA = {
  cliente: "Total do cliente",
  fornecedor: "Total do fornecedor",
  margem: "Margem",
} as const;

function dinheiro(valor: string | null | undefined): string {
  return preenchido(valor) && valor ? formatarMoeda(valor) : "—";
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

const TOTAL = "mt-0.5 text-[22px] leading-7 font-semibold tabular-nums";

/** Os saldos do Anexo B numa linha de pares; só entram os preenchidos, e zero conta. */
function Saldos({ pares }: Readonly<{ pares: [string, string | null | undefined][] }>) {
  const presentes = pares.filter(([, valor]) => preenchido(valor) && valor);
  if (presentes.length === 0) return null;
  return (
    <p className="mt-1 text-[13px] leading-5 text-texto-auxiliar">
      {presentes.map(([rotulo, valor], i) => (
        <Fragment key={rotulo}>
          {i > 0 && " · "}
          <span>
            {rotulo} <span className="tabular-nums">{dinheiro(valor)}</span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}

/** A verificação da conta (RF-06): a frase quando fecha, o aviso com os números quando não. */
export function VerificacaoDaConta({ dados }: Readonly<{ dados: VendaConsultada }>) {
  const { verificacao, servicos } = dados.calculos;
  if (verificacao.fecha) {
    return (
      <p className="mt-3 text-[13px] leading-5 text-texto-auxiliar">
        A soma dos serviços fecha com os totais da API.
      </p>
    );
  }
  const titulo =
    servicos.length === 1
      ? "A soma do serviço não fecha com os totais da API"
      : `A soma dos ${servicos.length} serviços não fecha com os totais da API`;
  return (
    <Aviso tom="atencao" className="mt-3">
      <p className="font-semibold">{titulo}</p>
      <ul className="mt-1">
        {verificacao.contas
          .filter((c) => !c.fecha)
          .map((c) => (
            <li key={c.conta}>
              {ROTULO_DA_CONTA[c.conta]}: serviços {formatarMoeda(c.calculado)}, API{" "}
              {formatarMoeda(c.api)}, diferença {formatarMoeda(c.diferenca)}.
            </li>
          ))}
      </ul>
    </Aviso>
  );
}

/**
 * O Financeiro da venda (IA 6.3; tela 3): os cartões Cliente, Fornecedor e Receita sobre a faixa
 * `superficie-sutil`, com os saldos do Anexo B e as linhas dos lançamentos, a frase da situação, o
 * grupo "Situação no Stur" e a verificação da conta (RF-06). O título é o da seção, só para o
 * leitor de tela, como no canvas.
 */
export function Financeiro({
  dados,
  nivelBase = 1,
}: Readonly<{ dados: VendaConsultada; nivelBase?: 1 | 2 }>) {
  const { venda, calculos } = dados;
  const hoje = diaEmFortaleza(dados.consultadoEm);
  const cancelada = situacaoDe(venda.status ?? null) === "cancelada";
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  const percentual = formatarPercentual(calculos.percentualLucro);
  const frase = fraseDaReceita(venda, calculos);

  return (
    <section data-anexo-secao="2" className="mt-6">
      <Titulo className="sr-only">Financeiro</Titulo>
      <div className="grid gap-4 rounded-grande bg-superficie-sutil px-5 py-4 min-[1100px]:grid-cols-3">
        <Cartao rotulo="Cliente">
          <p className={TOTAL}>{dinheiro(venda.totalCliente)}</p>
          <Saldos
            pares={[
              ["Recebido", venda.totalRecebidoCliente],
              ["A receber", venda.totalAReceberCliente],
              ["Taxas administrativas", venda.taxasAdministrativas],
            ]}
          />
          <CartaoLancamentos
            lado="cliente"
            lancamentos={calculos.recebimentos}
            venda={venda}
            hoje={hoje}
            nivel={nivel}
          />
        </Cartao>
        <Cartao rotulo="Fornecedor">
          <p className={TOTAL}>{dinheiro(venda.totalFornecedor)}</p>
          <Saldos
            pares={[
              ["Pago", venda.totalPagoFornec],
              ["A pagar", venda.totalAPagarFornec],
              ["A receber", venda.totalAReceberFornecedor],
              ["Recebido", venda.totalRecebidoFornec],
            ]}
          />
          <CartaoLancamentos
            lado="fornecedor"
            lancamentos={calculos.pagamentos}
            venda={venda}
            hoje={hoje}
            nivel={nivel}
          />
        </Cartao>
        <Cartao rotulo="Receita">
          <p className={TOTAL}>
            <span>{dinheiro(venda.margemLucroBruta)}</span>
            {percentual !== null && (
              <>
                {" "}
                <span className="text-sm font-medium text-texto-auxiliar">{percentual}</span>
              </>
            )}
          </p>
          {frase !== null && (
            <p className="mt-1 text-[13px] leading-[22px] text-texto-auxiliar">{frase}</p>
          )}
        </Cartao>
      </div>
      <p className="mt-1.5 text-[13px] leading-5 text-texto-auxiliar">
        {cancelada
          ? "Situação pelos totais da venda no Stur. O Stur zera o saldo a receber e a pagar da venda cancelada."
          : "Situação pelos totais da venda no Stur. Um valor em aberto pode já ter sido pago sem baixa."}
      </p>
      <GrupoDeCampos
        titulo="Situação no Stur"
        recolhido
        nivel={nivel}
        campos={camposSemMolde("Situação no Stur", ["financeiro"])}
        venda={venda}
        className="mt-2"
      />
      <VerificacaoDaConta dados={dados} />
    </section>
  );
}
