import type { ReactNode } from "react";
import type { Reserva } from "@/contrato/tipos";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import {
  fraseDaReceita,
  fraseDoCliente,
  fraseDoFornecedor,
  rotuloDoCliente,
  tituloDoFinanceiro,
} from "@/lib/reserva/lancamentos";
import { LancamentosReserva } from "./LancamentosReserva";

const ROTULO = "text-xs leading-4 font-semibold tracking-[0.02em] text-texto-auxiliar";
const TOTAL = "mt-0.5 text-[22px] leading-7 font-semibold tabular-nums";
const FRASE = "mt-1 text-[13px] leading-5 text-texto-auxiliar tabular-nums";

function Cartao({ rotulo, children }: Readonly<{ rotulo: string; children: ReactNode }>) {
  return (
    <div className="min-w-0">
      <p className={ROTULO}>{rotulo}</p>
      {children}
    </div>
  );
}

/**
 * O Financeiro da reserva (decisão 15; telas 4, 4b, 6b e 7b): os totais somados das vendas ativas
 * em três cartões sobre a faixa `superficie-sutil` (uma faixa só, com a venda aberta) e, embaixo, a
 * tabela de recebimentos e pagamentos. O título é só para o leitor de tela, como no canvas.
 */
export function FinanceiroReserva({
  reserva,
  hoje,
  vendaAberta,
}: Readonly<{ reserva: Reserva; hoje: string; vendaAberta: boolean }>) {
  const { totais } = reserva;
  const percentual = formatarPercentual(totais.percentualLucro);
  return (
    <section aria-labelledby="financeiro-da-reserva" className="mt-6">
      <div className="rounded-grande bg-superficie-sutil px-5 py-4">
        <h2 id="financeiro-da-reserva" className="sr-only">
          {tituloDoFinanceiro(reserva)}
        </h2>
        <div className="grid gap-4 min-[1100px]:grid-cols-3">
          <Cartao rotulo={rotuloDoCliente(reserva)}>
            <p className={TOTAL}>{formatarMoeda(totais.totalCliente)}</p>
            <p className={FRASE}>{fraseDoCliente(reserva)}</p>
          </Cartao>
          <Cartao rotulo="Fornecedor">
            <p className={TOTAL}>{formatarMoeda(totais.totalFornecedor)}</p>
            <p className={FRASE}>{fraseDoFornecedor(reserva)}</p>
          </Cartao>
          <Cartao rotulo="Receita">
            <p className={TOTAL}>
              <span>{formatarMoeda(totais.margem)}</span>
              {percentual !== null && (
                <>
                  {" "}
                  <span className="text-sm font-medium text-texto-auxiliar">{percentual}</span>
                </>
              )}
            </p>
            <p className={FRASE}>{fraseDaReceita(reserva)}</p>
          </Cartao>
        </div>
        <LancamentosReserva reserva={reserva} hoje={hoje} vendaAberta={vendaAberta} />
      </div>
    </section>
  );
}
