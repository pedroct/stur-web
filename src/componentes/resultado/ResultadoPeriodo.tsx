"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FalhaAtualizar } from "@/componentes/estados/FalhaAtualizar";
import { LinhaStatus } from "@/componentes/estados/LinhaStatus";
import { Filtros } from "@/componentes/filtros/Filtros";
import { Button } from "@/componentes/ui/button";
import type { ResultadoConsulta } from "@/contrato/tipos";
import type { ErroDaConsulta } from "@/lib/api/cliente";
import { useParametros } from "@/lib/api/parametros";
import { useAtalho } from "@/lib/atalhos";
import type { Consulta } from "@/lib/consulta/consulta";
import { textoCarregando } from "@/lib/consulta/descricao";
import { formatarMoeda } from "@/lib/formatacao";
import { lerPagina, paginar } from "@/lib/resultado/paginar";
import {
  contarOpcoes,
  escreverEnderecoResultado,
  lerRefinamentos,
  REFINAMENTOS_VAZIOS,
  type Refinamentos,
  refinar,
  somarVisiveis,
  temRefinamento,
} from "@/lib/resultado/refinar";
import { formatarHora } from "@/lib/tempo";
import { CabecalhoResultado } from "./CabecalhoResultado";
import { Paginacao } from "./Paginacao";
import { ResumoResultado } from "./ResumoResultado";
import { TabelaResultado } from "./TabelaResultado";

const ESPERA_DA_BUSCA_MS = 200;

/** `por` do endereço: um dos valores da lista; qualquer outro vale o padrão. */
function lerPor(texto: string | null, opcoes: number[], padrao: number): number {
  const por = texto !== null && /^\d+$/.test(texto) ? Number(texto) : null;
  return por !== null && opcoes.includes(por) ? por : padrao;
}

function textoDaContagem(
  visiveis: number,
  total: number,
  refinando: boolean,
  soma: ReturnType<typeof somarVisiveis>,
): string {
  if (visiveis === 0) return "Nenhuma venda com esses filtros.";
  if (!refinando) {
    return total === 1
      ? "Mostrando a venda do resultado."
      : `Mostrando as ${total} vendas do resultado.`;
  }
  return `Mostrando ${visiveis} de ${total} ${total === 1 ? "venda" : "vendas"} · Total cliente ${formatarMoeda(soma.totalCliente)} · Margem ${formatarMoeda(soma.margem)}`;
}

/**
 * Resultado de uma consulta por período (tela 1b). Puro: quem consulta é a página. Os
 * refinamentos e a paginação moram no endereço (`replace`, sem entrada no histórico).
 */
export function ResultadoPeriodo({
  consulta,
  resultado,
  atualizando,
  falhaAtualizar,
  aoAtualizar,
}: {
  consulta: Consulta;
  resultado: ResultadoConsulta;
  atualizando: boolean;
  falhaAtualizar: ErroDaConsulta | null;
  aoAtualizar: () => void;
}) {
  const roteador = useRouter();
  const parametrosDoEndereco = useSearchParams();
  const { linhasPorPagina, opcoesPorPagina, tempoLimiteSegundos } = useParametros();
  const idDaBusca = useId();
  useAtalho("u", aoAtualizar);

  // Lidos do endereço a cada renderização: o quadro de filtros já nasce aberto se houver refinamento.
  const refinamentos = useMemo(() => lerRefinamentos(parametrosDoEndereco), [parametrosDoEndereco]);
  const por = lerPor(parametrosDoEndereco.get("por"), opcoesPorPagina, linhasPorPagina);
  const opcoes = useMemo(() => contarOpcoes(resultado.vendas), [resultado.vendas]);
  const refinadas = useMemo(
    () => refinar(resultado.vendas, refinamentos),
    [resultado.vendas, refinamentos],
  );
  const pagina = paginar(refinadas, lerPagina(parametrosDoEndereco), por);
  const refinando = temRefinamento(refinamentos);
  const soma = useMemo(() => somarVisiveis(refinadas), [refinadas]);

  const enderecoDe = (r: Refinamentos, numeroDaPagina: number, porPagina: number) =>
    escreverEnderecoResultado(consulta, r, numeroDaPagina, porPagina, linhasPorPagina);

  // A busca espera a pessoa parar de digitar; o refinamento mais recente vem de uma ref, porque
  // um filtro marcado no meio da espera não pode ser desfeito quando a busca for escrita.
  const [busca, setBusca] = useState(refinamentos.q);
  const refinamentosAtuais = useRef(refinamentos);
  const qEscrito = useRef(refinamentos.q);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refinamentosAtuais.current = refinamentos;
    // Mudança que não veio da digitação (voltar do navegador, outro link): o campo a acompanha.
    if (refinamentos.q !== qEscrito.current) {
      qEscrito.current = refinamentos.q;
      setBusca(refinamentos.q);
    }
  }, [refinamentos]);

  useEffect(
    () => () => {
      if (espera.current !== null) clearTimeout(espera.current);
    },
    [],
  );

  function cancelarEspera() {
    if (espera.current !== null) clearTimeout(espera.current);
    espera.current = null;
  }

  function refinarPor(novos: Refinamentos) {
    roteador.replace(enderecoDe(novos, 1, por));
  }

  function digitar(texto: string) {
    setBusca(texto);
    cancelarEspera();
    espera.current = setTimeout(() => {
      espera.current = null;
      // Texto só de espaços não vai ao endereço; o campo o guarda e não deve ser zerado por isso.
      qEscrito.current = texto.trim() === "" ? "" : texto;
      refinarPor({ ...refinamentosAtuais.current, q: texto });
    }, ESPERA_DA_BUSCA_MS);
  }

  function limparFiltros() {
    cancelarEspera();
    qEscrito.current = "";
    setBusca("");
    refinarPor(REFINAMENTOS_VAZIOS);
  }

  const total = resultado.vendas.length;
  const comPeriodo = consulta.de !== null && consulta.ate !== null;
  const consultadoAs = formatarHora(resultado.consultadoEm);

  return (
    <>
      <CabecalhoResultado consulta={consulta} resultado={resultado} aoAtualizar={aoAtualizar} />
      {atualizando && (
        <div className="mt-4">
          <LinhaStatus texto={textoCarregando(consulta, tempoLimiteSegundos)} />
        </div>
      )}
      {falhaAtualizar && (
        <div className="mt-4">
          <FalhaAtualizar
            erro={falhaAtualizar}
            consultadoAs={consultadoAs}
            aoTentar={aoAtualizar}
          />
        </div>
      )}
      <ResumoResultado
        resumo={resultado.resumo}
        vendas={resultado.vendas}
        comPeriodo={comPeriodo}
        soNaoFecham={refinamentos.soNaoFecham}
        aoAlternarNaoFecham={() =>
          refinarPor({ ...refinamentos, soNaoFecham: !refinamentos.soNaoFecham })
        }
      />

      <section aria-labelledby={`${idDaBusca}-titulo`} className="mt-5">
        <h2 id={`${idDaBusca}-titulo`} className="sr-only">
          Vendas do resultado
        </h2>
        <div className="flex max-w-[520px] min-w-0 flex-col gap-2">
          <label htmlFor={idDaBusca} className="text-sm font-semibold">
            Buscar no resultado
          </label>
          <input
            id={idDaBusca}
            type="text"
            autoComplete="off"
            placeholder="Reserva, cliente, fornecedor, emissor ou produto"
            value={busca}
            onChange={(evento) => digitar(evento.target.value)}
            className="h-alvo w-full rounded-pequeno border border-borda-controle bg-superficie px-4 text-base text-texto-principal outline-0 placeholder:text-texto-auxiliar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
          />
        </div>
        <div className="mt-3">
          <Filtros modo="resultado" valor={refinamentos} opcoes={opcoes} aoMudar={refinarPor} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p role="status" className="text-sm leading-5 text-texto-auxiliar tabular-nums">
            {textoDaContagem(refinadas.length, total, refinando, soma)}
          </p>
          {refinando && (
            <Button
              variant="secundaria"
              className="px-4 text-sm font-medium"
              onClick={limparFiltros}
            >
              Limpar filtros
            </Button>
          )}
        </div>
        {refinadas.length > 0 && (
          <>
            <div className="mt-3">
              <TabelaResultado
                consulta={consulta}
                resultado={resultado}
                linhas={pagina.itens}
                refinadas={refinadas}
                enderecoAtual={enderecoDe(refinamentos, pagina.pagina, por)}
              />
            </div>
            <div className="mt-3">
              <Paginacao
                pagina={pagina}
                por={por}
                opcoes={opcoesPorPagina}
                aoMudarPor={(novo) => roteador.replace(enderecoDe(refinamentos, 1, novo))}
                aoIrPara={(numero) => roteador.replace(enderecoDe(refinamentos, numero, por))}
              />
            </div>
          </>
        )}
      </section>
    </>
  );
}
