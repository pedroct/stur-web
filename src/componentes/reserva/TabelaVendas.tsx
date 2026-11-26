"use client";

import { CircleX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect } from "react";
import { Selo } from "@/componentes/comum/Selo";
import { Cabeca, CELULA, FOCO } from "@/componentes/comum/tabela";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import type { Reserva, VendaDaReserva } from "@/contrato/tipos";
import { formatarPercentual, formatarValor } from "@/lib/formatacao";
import { ativasDaReserva } from "@/lib/reserva/cabecalho";
import {
  cancelada,
  fornecedorDaVenda,
  fraseReceitaNegativa,
  gruposDaTabela,
  passageirosDaVenda,
  passageirosDiferem,
  segundaLinha,
  seloDaCancelada,
} from "@/lib/reserva/tabela";
import { cn } from "@/lib/utils";
import { preenchido } from "@/lib/venda/campos";
import { dataSolta } from "@/lib/venda/datas";
import { enderecoDaVenda } from "@/lib/venda/rota";

/** A seção da venda aberta, logo abaixo da tabela: a `TelaReserva` a monta com este id. */
export const ID_DA_VENDA_ABERTA = "venda-aberta";

/** A venda que pediu para a página descer até ela, quando abrir; `seRolou`: só se a seção já passou do topo. */
let rolagemPedida: { idreserva: number; seRolou: boolean } | null = null;

function rolarAteAVenda(seRolou: boolean): void {
  const secao = document.getElementById(ID_DA_VENDA_ABERTA);
  if (secao === null || (seRolou && secao.getBoundingClientRect().top >= 0)) return;
  secao.scrollIntoView({ block: "start" });
}

/** Pede a descida até a venda, que acontece quando a seção dela mostrar essa venda. */
export function pedirRolagem(idreserva: number, seRolou = false): void {
  rolagemPedida = { idreserva, seRolou };
}

/** Na seção da venda aberta: desce até ela quando a venda que chegou é a que pediu. */
export function useRolagemAteAVenda(idreserva: number): void {
  useEffect(() => {
    if (rolagemPedida?.idreserva !== idreserva) return;
    const { seRolou } = rolagemPedida;
    rolagemPedida = null;
    rolarAteAVenda(seRolou);
  }, [idreserva]);
}

/** Só o clique simples navega por aqui; com Ctrl, ⌘ ou Shift, o link abre como o navegador quiser. */
export function cliqueSimples(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

const SEGUNDA_LINHA = "block text-[13px] leading-[18px]";

function Linha({
  venda,
  total,
  hoje,
  aberta,
  comPassageiro,
  aoAbrir,
}: Readonly<{
  venda: VendaDaReserva;
  total: number;
  hoje: string;
  aberta: boolean;
  comPassageiro: boolean;
  aoAbrir(e: MouseEvent, v: VendaDaReserva): void;
}>) {
  const { resumo } = venda;
  const fora = cancelada(venda);
  const servico = segundaLinha(venda);
  const emitida =
    resumo.dataEmissao !== null && preenchido(resumo.dataEmissao, "dtemissao")
      ? dataSolta(resumo.dataEmissao, hoje)
      : "—";
  return (
    <TableRow
      className={cn(
        "border-borda hover:bg-superficie-sutil",
        aberta && "bg-acao-fundo hover:bg-acao-fundo",
        fora && "text-texto-auxiliar",
      )}
    >
      <TableCell className={cn(CELULA, "min-w-[180px]")}>
        <Link
          href={enderecoDaVenda(resumo.numero, resumo.idreserva)}
          aria-current={aberta ? "page" : undefined}
          onClick={(e) => aoAbrir(e, venda)}
          className={cn(FOCO, "group block")}
        >
          <span
            className={cn(
              "block font-semibold underline-offset-2 group-hover:underline",
              fora ? "text-texto-auxiliar line-through" : "text-texto-principal",
            )}
          >
            {resumo.produto ?? "—"}
          </span>{" "}
          <span
            className={cn(
              SEGUNDA_LINHA,
              aberta ? "font-semibold text-acao-primaria" : "text-texto-auxiliar",
            )}
          >
            venda {venda.posicao} de {total}
            {aberta && " · aberta abaixo"}
          </span>
        </Link>
        {fora && (
          <span className="mt-1 block">
            <Selo tom="neutro" icone={CircleX}>
              {seloDaCancelada(venda, hoje)}
            </Selo>
          </span>
        )}
      </TableCell>
      {comPassageiro && (
        <TableCell className={CELULA}>{passageirosDaVenda(venda) || "—"}</TableCell>
      )}
      <TableCell className={cn(CELULA, "min-w-[220px]")}>
        {fornecedorDaVenda(venda) ?? "—"}
        {servico !== "" && (
          <span className={cn(SEGUNDA_LINHA, "text-texto-auxiliar")}>{servico}</span>
        )}
      </TableCell>
      <TableCell className={CELULA}>{emitida}</TableCell>
      <TableCell className={cn(CELULA, "text-right")}>
        {formatarValor(resumo.totalCliente)}
      </TableCell>
      <TableCell className={cn(CELULA, "text-right")}>
        {fora ? "fora do total" : formatarValor(resumo.margem)}
      </TableCell>
    </TableRow>
  );
}

/**
 * "Vendas desta reserva" em tabela (IA 6.10; telas 4b, 6b e 7b): os grupos pela classificação, as
 * canceladas riscadas num grupo no fim e fora do total, e o total das ativas no rodapé. Clicar abre
 * a venda logo abaixo da tabela, sem rolar a página para o topo: ela desce até a venda.
 */
export function TabelaVendas({
  reserva,
  hoje,
  aberta,
}: Readonly<{ reserva: Reserva; hoje: string; aberta?: number }>) {
  const roteador = useRouter();
  const total = reserva.vendas.length;
  const comPassageiro = passageirosDiferem(reserva);
  const colunas = comPassageiro ? 6 : 5;
  const { totais } = reserva;
  const percentual = formatarPercentual(totais.percentualLucro);
  const negativa = fraseReceitaNegativa(reserva);

  function aoAbrir(e: MouseEvent, v: VendaDaReserva) {
    if (!cliqueSimples(e)) return;
    e.preventDefault();
    if (v.resumo.idreserva === aberta) {
      rolarAteAVenda(false);
      return;
    }
    pedirRolagem(v.resumo.idreserva);
    roteador.push(enderecoDaVenda(reserva.numero, v.resumo.idreserva), { scroll: false });
  }

  return (
    <div>
      <div className="mt-3 rounded-grande border border-borda">
        <Table className="min-w-[900px]">
          <TableCaption className="sr-only">
            Vendas da reserva {reserva.numero}, agrupadas pela classificação do Stur
          </TableCaption>
          <TableHeader>
            <TableRow className="border-borda hover:bg-transparent">
              <Cabeca>Venda</Cabeca>
              {comPassageiro && <Cabeca>Passageiro</Cabeca>}
              <Cabeca>Fornecedor e serviço</Cabeca>
              <Cabeca>Emitida</Cabeca>
              <Cabeca className="text-right">Cliente (R$)</Cabeca>
              <Cabeca className="text-right">Receita (R$)</Cabeca>
            </TableRow>
          </TableHeader>
          {gruposDaTabela(reserva).map((grupo) => (
            <TableBody key={grupo.rotulo} className="tabular-nums">
              <TableRow className="border-borda bg-superficie-sutil hover:bg-superficie-sutil">
                <TableHead
                  scope="rowgroup"
                  colSpan={colunas}
                  className="h-auto px-4 py-2 text-xs font-semibold text-texto-auxiliar"
                >
                  {grupo.rotulo}
                </TableHead>
              </TableRow>
              {grupo.vendas.map((v) => (
                <Linha
                  key={v.resumo.idreserva}
                  venda={v}
                  total={total}
                  hoje={hoje}
                  aberta={v.resumo.idreserva === aberta}
                  comPassageiro={comPassageiro}
                  aoAbrir={aoAbrir}
                />
              ))}
            </TableBody>
          ))}
          <TableFooter className="border-t-2 border-texto-principal bg-transparent tabular-nums">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colunas - 2} className={cn(CELULA, "font-semibold")}>
                Total das {ativasDaReserva(reserva).length} vendas ativas
              </TableCell>
              <TableCell className={cn(CELULA, "text-right font-semibold")}>
                {formatarValor(totais.totalCliente)}
              </TableCell>
              <TableCell className={cn(CELULA, "text-right font-semibold")}>
                {formatarValor(totais.margem)}
                {percentual !== null && (
                  <>
                    {" "}
                    <span className="font-medium text-texto-auxiliar">{percentual}</span>
                  </>
                )}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {negativa !== null && (
        <p className="mt-2 max-w-[760px] text-[13px] leading-5 text-texto-auxiliar">{negativa}</p>
      )}
      {aberta === undefined && (
        <p className="mt-3 text-sm leading-5 text-texto-auxiliar">
          Escolha uma venda para abrir a conta, os serviços e os lançamentos dela logo abaixo da
          tabela.
        </p>
      )}
    </div>
  );
}
