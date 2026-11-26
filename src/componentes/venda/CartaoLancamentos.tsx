import { dadosDoSeloTexto, Selo } from "@/componentes/comum/Selo";
import type { LancamentoCalculado, PagamentoAgi, RecebimentoAgi, VendaAgi } from "@/contrato/tipos";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";
import { fornecedoresDe, preenchido } from "@/lib/venda/campos";
import { fraseSemLancamentos, seloDoLancamento, textoDoLancamento } from "@/lib/venda/lancamentos";
import { GrupoDeCampos, type NivelDeTitulo } from "./GrupoDeCampos";

type Lado = "cliente" | "fornecedor";

const PREFIXO: Record<Lado, string> = { cliente: "recebimentos[].", fornecedor: "pagamentos[]." };

function texto(valor: string | null | undefined): string | null {
  return valor !== null && valor !== undefined && valor.trim() !== "" ? valor.trim() : null;
}

/**
 * Os campos da seção 6 que a linha já mostra para este lançamento (decisão 8), e que os detalhes
 * por isso deixam de repetir. Espelha `textoDoLancamento` e `seloDoLancamento`: a forma e o valor
 * não vão na linha do cartão repassado, e o crédito não leva a forma; o vencimento só vai no selo
 * do que está em aberto e no texto do cartão repassado.
 */
export function caminhosDaLinha(
  l: LancamentoCalculado,
  cru: RecebimentoAgi | PagamentoAgi,
  lado: Lado,
  mostrarValor: boolean,
): Set<string> {
  const prefixo = PREFIXO[lado];
  const mostrados = new Set<string>();
  if (!l.cartaoRepassado) {
    if (!l.ehCredito && texto(l.descricaoForma) !== null) mostrados.add(`${prefixo}descricaoForma`);
    if (l.ehCredito ? preenchido(cru.valor) : mostrarValor) mostrados.add(`${prefixo}valor`);
  }
  const vencimento = l.cartaoRepassado ? (cru.dtVencto ?? l.vencimento) : l.vencimento;
  const naLinha = l.cartaoRepassado || l.situacao === "em_aberto";
  if (naLinha && preenchido(vencimento, "vencimento")) mostrados.add(`${prefixo}dtVencto`);
  return mostrados;
}

/** Os campos da seção 6 do lançamento que a linha do cartão não mostra (decisão 8). */
export function camposDosDetalhes(
  l: LancamentoCalculado,
  cru: RecebimentoAgi | PagamentoAgi,
  lado: Lado,
  mostrarValor: boolean,
): CampoAnexo[] {
  const mostrados = caminhosDaLinha(l, cru, lado, mostrarValor);
  return CAMPOS_ANEXO_B.filter(
    (c) =>
      c.secao === 6 &&
      c.caminho.startsWith(PREFIXO[lado]) &&
      !c.conteiner &&
      !mostrados.has(c.caminho),
  );
}

/**
 * As linhas de um cartão do Financeiro (decisão 3): o selo, o texto e, recolhidos, os detalhes do
 * lançamento, com os campos da seção 6 que a linha não mostra (decisão 8). Com as tabelas de
 * recebimentos e pagamentos na página (`comDetalhes` falso), os detalhes ficam só nelas.
 */
export function CartaoLancamentos({
  lado,
  lancamentos,
  venda,
  hoje,
  nivel,
  comDetalhes = true,
}: Readonly<{
  lado: Lado;
  lancamentos: LancamentoCalculado[];
  venda: VendaAgi;
  hoje: string;
  nivel: NivelDeTitulo;
  comDetalhes?: boolean;
}>) {
  const lista = lado === "cliente" ? venda.recebimentos : venda.pagamentos;
  const fornecedor = fornecedoresDe(texto(venda.nomefornec), texto(venda.nomefornec2)).principal;
  const mostrarValor = lancamentos.length > 1;

  if (lancamentos.length === 0) {
    return (
      <p className="mt-2 text-[13px] leading-[22px] text-texto-auxiliar">
        {fraseSemLancamentos(lado)}
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-[22px] text-texto-auxiliar">
      {lancamentos.map((l) => {
        const cru = lista?.[l.indice];
        if (cru === undefined) return null;
        const selo = dadosDoSeloTexto(seloDoLancamento(l, lado, hoje));
        const detalhes = camposDosDetalhes(l, cru, lado, mostrarValor);
        return (
          <li key={l.indice} data-anexo-secao={comDetalhes ? "6" : undefined}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Selo {...selo} borda={selo.borda || selo.tom === "neutro"}>
                {selo.texto}
              </Selo>
              <span>{textoDoLancamento(l, cru, mostrarValor, fornecedor, hoje)}</span>
            </div>
            {comDetalhes && (
              <GrupoDeCampos
                titulo="Detalhes do lançamento"
                recolhido
                secao={6}
                nivel={nivel}
                campos={detalhes}
                venda={venda}
                indices={[l.indice]}
                className="text-texto-principal"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
