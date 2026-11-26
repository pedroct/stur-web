import { Fragment, useId } from "react";
import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import { Cabeca, CELULA } from "@/componentes/comum/tabela";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/componentes/ui/table";
import type {
  LancamentoCalculado,
  PagamentoAgi,
  RecebimentoAgi,
  VendaConsultada,
} from "@/contrato/tipos";
import { ehDecimal } from "@/lib/decimal";
import { formatarData, formatarValor } from "@/lib/formatacao";
import { diaEmFortaleza } from "@/lib/tempo";
import { cn } from "@/lib/utils";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { preenchido } from "@/lib/venda/campos";
import { fraseSemLancamentos, seloDoLancamento, textoDosDocumentos } from "@/lib/venda/lancamentos";
import { GrupoDeCampos, type NivelDeTitulo, temCampos } from "./GrupoDeCampos";

type Lado = "cliente" | "fornecedor";

const PREFIXO: Record<Lado, string> = { cliente: "recebimentos[].", fornecedor: "pagamentos[]." };
const TITULO: Record<Lado, string> = {
  cliente: "Recebimentos do cliente",
  fornecedor: "Pagamentos ao fornecedor",
};
const COLUNAS = ["Forma", "Documento", "Vencimento", "Valor (R$)", "Situação"];

function texto(valor: string | null | undefined): string | null {
  return valor !== null && valor !== undefined && valor.trim() !== "" ? valor.trim() : null;
}

function dinheiro(valor: string | null | undefined): string {
  return valor !== null && valor !== undefined && ehDecimal(valor) ? formatarValor(valor) : "—";
}

type Linha = {
  l: LancamentoCalculado;
  cru: RecebimentoAgi | PagamentoAgi;
  forma: string | null;
  vencimento: string | null;
  valor: string;
};

/** O que as colunas mostram de um lançamento; o crédito vem positivo, como `pagamentos[].valor`. */
function linhaDe(l: LancamentoCalculado, cru: RecebimentoAgi | PagamentoAgi): Linha {
  const vencimento = cru.dtVencto;
  return {
    l,
    cru,
    forma: l.ehCredito ? null : texto(l.descricaoForma),
    vencimento:
      preenchido(vencimento, "vencimento") && vencimento ? formatarData(vencimento) : null,
    valor: l.ehCredito ? dinheiro(cru.valor) : dinheiro(l.valorExibido),
  };
}

/** Os campos da seção 6 do lançamento que as colunas não mostram (decisão 8). */
function camposDosDetalhes(linha: Linha, lado: Lado) {
  const prefixo = PREFIXO[lado];
  const mostrados = new Set([`${prefixo}valor`]);
  if (linha.forma !== null) mostrados.add(`${prefixo}descricaoForma`);
  if (linha.vencimento !== null) mostrados.add(`${prefixo}dtVencto`);
  return CAMPOS_ANEXO_B.filter(
    (c) =>
      c.secao === 6 && c.caminho.startsWith(prefixo) && !c.conteiner && !mostrados.has(c.caminho),
  );
}

function TabelaDoLado({
  lado,
  dados,
  nivel,
}: Readonly<{ lado: Lado; dados: VendaConsultada; nivel: NivelDeTitulo }>) {
  const id = useId();
  const { venda, calculos } = dados;
  const hoje = diaEmFortaleza(dados.consultadoEm);
  const lancamentos = lado === "cliente" ? calculos.recebimentos : calculos.pagamentos;
  const lista: (RecebimentoAgi | PagamentoAgi)[] =
    (lado === "cliente" ? venda.recebimentos : venda.pagamentos) ?? [];
  const linhas = lancamentos.flatMap((l) => {
    const cru = lista[l.indice];
    return cru === undefined ? [] : [linhaDe(l, cru)];
  });
  const Titulo = `h${nivel}` as const;

  return (
    <div className="mt-6">
      <Titulo id={id} className="text-base leading-6 font-semibold">
        {TITULO[lado]}
      </Titulo>
      {linhas.length === 0 ? (
        <p className="mt-2 text-sm leading-5 text-texto-auxiliar">{fraseSemLancamentos(lado)}</p>
      ) : (
        <div className="mt-3 rounded-medio border border-borda">
          <Table aria-labelledby={id} className="min-w-[720px]">
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
                const { l } = linha;
                const selo = dadosDoSeloTexto(seloDoLancamento(l, lado, hoje));
                const detalhes = camposDosDetalhes(linha, lado);
                const indices = [l.indice];
                const comDetalhes = temCampos(detalhes, venda, calculos, indices);
                return (
                  <Fragment key={l.indice}>
                    <TableRow
                      className={cn("border-borda hover:bg-transparent", comDetalhes && "border-0")}
                    >
                      <TableCell className={CELULA}>
                        {l.ehCredito ? (
                          <>
                            Crédito a receber do fornecedor
                            <span className="block text-[13px] leading-5 text-texto-auxiliar">
                              no Stur, aparece em pagamentos com sinal negativo
                            </span>
                          </>
                        ) : (
                          (linha.forma ?? "")
                        )}
                      </TableCell>
                      <TableCell className={CELULA}>{textoDosDocumentos(l.documentos)}</TableCell>
                      <TableCell className={CELULA}>{linha.vencimento ?? ""}</TableCell>
                      <TableCell className={cn(CELULA, "text-right")}>{linha.valor}</TableCell>
                      <TableCell className={CELULA}>
                        <Selo {...selo} borda={selo.borda || selo.tom === "neutro"}>
                          {selo.texto}
                        </Selo>
                      </TableCell>
                    </TableRow>
                    {comDetalhes && (
                      <TableRow className="border-borda hover:bg-transparent">
                        <TableCell colSpan={COLUNAS.length} className="px-4 pt-0 pb-2">
                          <GrupoDeCampos
                            titulo="Detalhes do lançamento"
                            recolhido
                            secao={6}
                            nivel={nivel}
                            campos={detalhes}
                            venda={venda}
                            calculos={calculos}
                            indices={indices}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Recebimentos e pagamentos (IA 6.7; decisão 8): uma tabela por lado, com a forma, o documento,
 * o vencimento, o valor e a situação, e os detalhes de cada lançamento recolhidos na linha de
 * baixo. Sem lançamentos num lado, a frase da IA 9.3; no incentivo (`semClienteVazio`), que não
 * tem venda a cliente, o lado do cliente sem lançamentos não aparece.
 */
export function Lancamentos({
  dados,
  nivelBase,
  semClienteVazio = false,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2; semClienteVazio?: boolean }>) {
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  const semCliente = semClienteVazio && dados.calculos.recebimentos.length === 0;
  return (
    <section data-anexo-secao="6" className="mt-10">
      <Titulo className="text-xl leading-7 font-semibold">Recebimentos e pagamentos</Titulo>
      {!semCliente && <TabelaDoLado lado="cliente" dados={dados} nivel={nivel} />}
      <TabelaDoLado lado="fornecedor" dados={dados} nivel={nivel} />
    </section>
  );
}
