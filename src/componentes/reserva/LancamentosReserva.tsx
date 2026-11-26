import { ChevronRight } from "lucide-react";
import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import { Cabeca, CELULA } from "@/componentes/comum/tabela";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import type { Reserva } from "@/contrato/tipos";
import { formatarData, formatarValor } from "@/lib/formatacao";
import {
  fraseDaSituacao,
  fraseSemLancamentosDaReserva,
  linhasDaReserva,
} from "@/lib/reserva/lancamentos";
import { cn } from "@/lib/utils";

const COLUNAS = ["Lançamento", "Documento", "Vencimento", "Valor (R$)", "Situação"];

/**
 * Recebimentos e pagamentos da reserva numa tabela só (decisão 11; tela 4): aberta quando nenhuma
 * venda está aberta, recolhida em "Ver recebimentos e pagamentos da reserva" quando há uma.
 */
export function LancamentosReserva({
  reserva,
  hoje,
  vendaAberta,
}: Readonly<{ reserva: Reserva; hoje: string; vendaAberta: boolean }>) {
  const linhas = linhasDaReserva(reserva, hoje);
  return (
    <details open={!vendaAberta} className="group mt-3">
      <summary className="flex min-h-alvo cursor-pointer items-center gap-2 text-sm font-medium">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {vendaAberta
          ? "Ver recebimentos e pagamentos da reserva"
          : "Recebimentos e pagamentos da reserva"}
      </summary>
      {linhas.length === 0 ? (
        <p className="mt-2 text-sm leading-5 text-texto-auxiliar">
          {fraseSemLancamentosDaReserva(reserva)}
        </p>
      ) : (
        <div className="mt-3 rounded-grande border border-borda bg-fundo">
          <Table className="min-w-[860px]">
            <TableCaption className="sr-only">
              Recebimentos e pagamentos lançados nas vendas ativas da reserva {reserva.numero}
            </TableCaption>
            <TableHeader>
              <TableRow className="border-borda hover:bg-transparent">
                {COLUNAS.map((c) => (
                  <Cabeca key={c} className={c === "Valor (R$)" ? "text-right" : undefined}>
                    {c}
                  </Cabeca>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {linhas.map((linha) => {
                const selo = dadosDoSeloTexto(linha.selo);
                return (
                  <TableRow key={linha.chave} className="border-borda hover:bg-transparent">
                    <TableCell className={CELULA}>{linha.rotulo}</TableCell>
                    <TableCell className={cn(CELULA, "font-mono")}>{linha.documento}</TableCell>
                    <TableCell className={CELULA}>{formatarData(linha.vencimento)}</TableCell>
                    <TableCell className={cn(CELULA, "text-right")}>
                      {formatarValor(linha.valor)}
                    </TableCell>
                    <TableCell className={CELULA}>
                      <Selo {...selo} borda={selo.borda || selo.tom === "neutro"}>
                        {selo.texto}
                      </Selo>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="mt-2 max-w-[760px] text-[13px] leading-5 text-texto-auxiliar tabular-nums">
        {fraseDaSituacao(reserva)}
      </p>
    </details>
  );
}
