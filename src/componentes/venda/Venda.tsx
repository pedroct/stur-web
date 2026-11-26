"use client";

import type { VendaConsultada } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { avisosDaVenda } from "@/lib/venda/cabecalho";
import { caminhosDaConta } from "@/lib/venda/conta";
import { idDaVenda } from "@/lib/venda/copia";
import { primeiroLocalizador } from "@/lib/venda/itinerario";
import { comTabelaDeLancamentos, incentivoComTabela } from "@/lib/venda/lancamentos";
import { Avisos } from "./Avisos";
import { BlocoConta, GruposDoServico } from "./BlocoConta";
import { CabecalhoVenda } from "./CabecalhoVenda";
import { CodigosStur } from "./CodigosStur";
import { ConteudoDoProduto } from "./ConteudoDoProduto";
import { CopiarDaVenda } from "./CopiarParaEnviar";
import { Financeiro } from "./Financeiro";
import type { NivelDeTitulo } from "./GrupoDeCampos";
import { Incentivo } from "./Incentivo";
import { Lancamentos } from "./Lancamentos";
import { MaisDetalhes } from "./MaisDetalhes";
import { VerDadoCru } from "./PainelDadoCru";
import { Pessoa } from "./Pessoa";
import { usePainel } from "./painel-contexto";
import { SecaoVinculos } from "./SecaoVinculos";

export type ConsultaDaVenda = {
  atualizando: boolean;
  aoAtualizar(): void;
  falha: ErroDaConsulta | null;
};

/**
 * A venda, na ordem da IA 6.1: cabeçalho, avisos, Financeiro (ou Incentivo), conteúdo do produto,
 * pessoa e conta, recebimentos e pagamentos, vínculos, Mais detalhes e Códigos do Stur. Sozinha
 * (`nivelBase` 1), o cabeçalho é o da página, com o cliente em h1 e a linha da consulta; aberta
 * dentro da reserva (`naReserva`, `nivelBase` 2), é o da venda aberta, com "Venda {k} · {produto}"
 * em h2, e tudo desce um nível (IA 6.10). A linha da consulta, com o Atualizar, fica na reserva.
 */
export function Venda({
  dados,
  naReserva,
  nivelBase,
  consulta,
}: Readonly<{
  dados: VendaConsultada;
  naReserva: boolean;
  nivelBase: 1 | 2;
  consulta: ConsultaDaVenda;
}>) {
  const { venda, calculos } = dados;
  const painel = usePainel();
  // A venda de incentivo tem o `Incentivo` no lugar do Financeiro, do conteúdo do produto, da
  // pessoa e da conta (tela 17).
  const comFinanceiro = calculos.tipo !== "incentivo";
  // Com um serviço só, a pessoa e os grupos da seção 5 ficam na página; com vários, no painel de
  // cada serviço, e a conta da página é a soma (decisões 22 e 23).
  const servicos = venda.detalheItem ?? [];
  const [servico] = servicos;
  const [conta] = calculos.servicos;
  const umServico = servicos.length === 1;
  const classificacao = venda.classificacaoproduto ?? null;
  const classe = classificacaoDe(classificacao) ?? "";
  // O card da hospedagem e o do veículo já trazem a pessoa como par.
  const cardComPessoa = ["hotelaria", "locacao"].includes(classe);
  // A observação do serviço único de Diversos e Pacote já está embaixo da tabela.
  const naPagina =
    umServico && servico !== undefined && conta !== undefined
      ? new Set([
          ...caminhosDaConta(conta, servico, classificacao),
          ...(["diversos", "pacote"].includes(classe) ? ["detalheItem[].observacao"] : []),
        ])
      : null;

  return (
    <>
      <CabecalhoVenda
        dados={dados}
        consulta={consulta}
        naReserva={naReserva}
        acaoPrincipal={naReserva ? undefined : <CopiarDaVenda dados={dados} />}
        acaoSecundaria={<VerDadoCru aoClicar={() => painel.abrirDadoCru(idDaVenda(dados))} />}
      />
      <Avisos lista={avisosDaVenda(venda, calculos, dados.vinculos)} />
      {!comFinanceiro && <Incentivo dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && <Financeiro dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && <ConteudoDoProduto dados={dados} nivelBase={nivelBase} />}
      {comFinanceiro && umServico && (
        <Pessoa
          venda={venda}
          indice={0}
          classificacao={classificacao}
          localizador={primeiroLocalizador(venda.trechos ?? [])}
          nivel={(nivelBase + 2) as NivelDeTitulo}
          semLinha={cardComPessoa}
        />
      )}
      {comFinanceiro && (
        <BlocoConta
          contas={calculos.servicos}
          servicos={servicos}
          classificacao={classificacao}
          situacao={venda.status ?? null}
          venda={venda}
          nivelBase={nivelBase}
        />
      )}
      {comFinanceiro && naPagina !== null && conta !== undefined && (
        <GruposDoServico
          venda={venda}
          calculos={calculos}
          indice={conta.indice}
          nivel={(nivelBase + 2) as NivelDeTitulo}
          excluir={naPagina}
        />
      )}
      {/* No incentivo, o cartão Recebimento mostra um lançamento; a tabela, quando há mais. */}
      {(comFinanceiro
        ? comTabelaDeLancamentos(calculos.recebimentos.length, calculos.pagamentos.length)
        : incentivoComTabela(calculos.recebimentos.length, calculos.pagamentos.length)) && (
        <Lancamentos dados={dados} nivelBase={nivelBase} semClienteVazio={!comFinanceiro} />
      )}
      <SecaoVinculos dados={dados} nivelBase={nivelBase} />
      <MaisDetalhes dados={dados} nivelBase={nivelBase} />
      <CodigosStur dados={dados} nivelBase={nivelBase} />
    </>
  );
}
