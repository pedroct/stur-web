"use client";

import { Button } from "@base-ui/react/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import { Painel } from "@/componentes/comum/Painel";
import type { ServicoAgi, VendaConsultada } from "@/contrato/tipos";
import { ignorarAtalho } from "@/lib/atalhos";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { nomeDoProduto } from "@/lib/venda/cabecalho";
import { preenchido } from "@/lib/venda/campos";
import { caminhosDaConta } from "@/lib/venda/conta";
import { periodoCurto } from "@/lib/venda/datas";
import { primeiroLocalizador } from "@/lib/venda/itinerario";
import { BlocoConta, GruposDoServico } from "./BlocoConta";
import { GrupoDeCampos } from "./GrupoDeCampos";
import { Pessoa } from "./Pessoa";
import { usePainel } from "./painel-contexto";
import { GRUPOS_DO_SERVICO_DA_SECAO_3, nomeDoGrupo, texto } from "./produto-comum";

const SETA = cn(
  "inline-flex size-alvo shrink-0 items-center justify-center rounded-pilula border border-borda text-texto-principal outline-0 transition-colors duration-150 hover:bg-superficie-sutil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco",
  "aria-disabled:cursor-not-allowed aria-disabled:text-borda-controle aria-disabled:hover:bg-transparent",
);

type CampoDeData =
  | "dtEntrada"
  | "dtSaida"
  | "dtRetirada"
  | "dtDevolucao"
  | "dtInicio"
  | "dtTermino";

const DATAS_DO_SERVICO: Record<string, [CampoDeData, CampoDeData]> = {
  hotelaria: ["dtEntrada", "dtSaida"],
  locacao: ["dtRetirada", "dtDevolucao"],
};

/** As datas do serviço pela classificação: entrada e saída, retirada e devolução, início e término. */
function periodoDoServico(s: ServicoAgi, classificacao: string | null): string | null {
  const campos = DATAS_DO_SERVICO[classificacaoDe(classificacao) ?? ""] ?? [
    "dtInicio",
    "dtTermino",
  ];
  const [de, ate] = campos.map((campo) => {
    const valor = s[campo];
    return typeof valor === "string" && preenchido(valor, `detalheItem[].${campo}`) ? valor : null;
  });
  return periodoCurto(de ?? null, ate ?? null);
}

function tituloDaVenda(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-titulo-venda]");
}

/**
 * O painel do serviço `k` (IA 6.6; tela 5; decisão 22): a posição com as setas, a descrição em h2
 * com o subtítulo, a pessoa (seção 4), a conta e os grupos da seção 5, o resultado e os campos da
 * seção 3 do serviço. As setas e ← → trocam de serviço por `replace` (decisão 20).
 */
export function PainelServico({ dados, k }: Readonly<{ dados: VendaConsultada; k: number }>) {
  const painel = usePainel();
  const { venda, calculos } = dados;
  const indice = k - 1;
  const servico = venda.detalheItem?.[indice];
  const conta = calculos.servicos.find((c) => c.indice === indice);
  if (servico === undefined || conta === undefined) return null;

  const n = calculos.servicos.length;
  const vendas = dados.reserva.vendas.length;
  const classificacao = venda.classificacaoproduto ?? null;
  const pessoa = texto(servico.nomePaxCompleto) ?? texto(servico.nomePax);
  const titulo = texto(servico.descricao) ?? pessoa ?? `Serviço ${k}`;
  const subtitulo = [
    nomeDoProduto(venda.nomeproduto ?? null, venda.categoriaproduto ?? null),
    periodoDoServico(servico, classificacao),
  ]
    .filter((parte) => parte !== null && parte !== "")
    .join(" · ");
  const mostrados = caminhosDaConta(conta, servico, classificacao);
  const primeiro = k <= 1;
  const ultimo = k >= n;

  function aoTeclar(e: KeyboardEvent) {
    if (ignorarAtalho(e.nativeEvent)) return;
    if (e.key === "ArrowLeft" && !primeiro) {
      e.preventDefault();
      painel.trocarServico(k - 1);
    } else if (e.key === "ArrowRight" && !ultimo) {
      e.preventDefault();
      painel.trocarServico(k + 1);
    }
  }

  const topo = (
    <>
      <Button
        className={SETA}
        aria-label="Serviço anterior"
        title="Serviço anterior (←)"
        aria-keyshortcuts="ArrowLeft"
        disabled={primeiro}
        focusableWhenDisabled
        onClick={() => painel.trocarServico(k - 1)}
      >
        <ChevronLeft className="size-[18px]" aria-hidden="true" />
      </Button>
      <Button
        className={SETA}
        aria-label="Próximo serviço"
        title="Próximo serviço (→)"
        aria-keyshortcuts="ArrowRight"
        disabled={ultimo}
        focusableWhenDisabled
        onClick={() => painel.trocarServico(k + 1)}
      >
        <ChevronRight className="size-[18px]" aria-hidden="true" />
      </Button>
      <span className="text-sm text-texto-auxiliar tabular-nums">
        Serviço {k} de {n}
        {vendas > 1 && ` · venda ${dados.posicao} de ${vendas}`}
      </span>
    </>
  );

  const percentual = formatarPercentual(conta.percentualLucro) ?? "% de lucro: não se aplica";

  return (
    <Painel
      titulo={titulo}
      subtitulo={subtitulo === "" ? undefined : subtitulo}
      topo={topo}
      aberto
      aoFechar={painel.fecharPainel}
      largura={640}
      aoTeclar={aoTeclar}
      focoSemAbridor={tituloDaVenda}
    >
      <Pessoa
        venda={venda}
        indice={indice}
        classificacao={classificacao}
        localizador={primeiroLocalizador(venda.trechos ?? [])}
        nivel={3}
      />
      <BlocoConta
        contas={[conta]}
        servicos={[servico]}
        classificacao={classificacao}
        situacao={venda.status ?? null}
        venda={venda}
        noPainel
      />
      <section className="mt-8 rounded-grande bg-superficie-sutil p-5">
        <h3 className="text-xs leading-4 font-semibold tracking-[0.02em] text-texto-auxiliar">
          Resultado do serviço
        </h3>
        <p className="mt-2 text-[13px] leading-5 text-texto-auxiliar">Receita da agência</p>
        <p className="text-xl leading-7 font-semibold tabular-nums">
          {formatarMoeda(conta.margem)}{" "}
          <span className="text-sm font-medium text-texto-auxiliar">{percentual}</span>
        </p>
      </section>
      {n > 1 && (
        <div data-anexo-secao="3" className="mt-8 space-y-6 empty:hidden">
          {GRUPOS_DO_SERVICO_DA_SECAO_3.map((grupo) => {
            const campos = CAMPOS_ANEXO_B.filter(
              (c) => c.grupo === grupo && !c.conteiner && !mostrados.has(c.caminho),
            );
            const comuns = { titulo: nomeDoGrupo(grupo), venda, calculos, indices: [indice] };
            return (
              <div key={grupo} className="space-y-1 empty:hidden">
                <GrupoDeCampos
                  campos={campos.filter((c) => c.aparece !== "recolhido")}
                  nivel={3}
                  {...comuns}
                />
                <GrupoDeCampos
                  campos={campos.filter((c) => c.aparece === "recolhido")}
                  nivel={3}
                  recolhido
                  {...comuns}
                />
              </div>
            );
          })}
        </div>
      )}
      <GruposDoServico
        venda={venda}
        calculos={calculos}
        indice={indice}
        nivel={3}
        excluir={mostrados}
      />
    </Painel>
  );
}
