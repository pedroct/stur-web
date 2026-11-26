"use client";

import { Esqueleto } from "@/componentes/comum/Esqueleto";
import { LinhaStatus } from "@/componentes/estados/LinhaStatus";
import { Caminho } from "@/componentes/moldura/Caminho";
import { useParametros } from "@/lib/api/parametros";
import type { Consulta } from "@/lib/consulta/consulta";
import { textoCarregando, tituloConsulta, tituloCurto } from "@/lib/consulta/descricao";

/** Larguras do rótulo e do valor de cada bloco do resumo, como no canvas. */
const BLOCOS_DO_RESUMO: [number, number][] = [
  [60, 60],
  [90, 150],
  [110, 130],
  [140, 40],
];

/** As 9 colunas da tabela; as três últimas são de valores, alinhadas à direita. */
const COLUNAS = "grid-cols-[90px_140px_1fr_1fr_60px_100px_100px_80px_70px]";
const LARGURAS_DAS_LINHAS = [
  ["80%", "70%"],
  ["60%", "85%"],
  ["90%", "55%"],
  ["70%", "75%"],
  ["85%", "60%"],
  ["65%", "80%"],
  ["75%", "65%"],
  ["55%", "90%"],
];

function LinhaDoEsqueleto({
  cliente,
  fornecedor,
}: Readonly<{ cliente: string; fornecedor: string }>) {
  return (
    <div className={`grid ${COLUNAS} gap-4 border-b border-borda px-4 py-3.5 last:border-b-0`}>
      <Esqueleto largura={80} altura={16} />
      <Esqueleto largura={110} altura={16} />
      <Esqueleto largura={cliente} altura={16} />
      <Esqueleto largura={fornecedor} altura={16} />
      <Esqueleto largura={44} altura={16} />
      <Esqueleto largura={90} altura={20} />
      <div className="flex justify-end">
        <Esqueleto largura={80} altura={16} />
      </div>
      <div className="flex justify-end">
        <Esqueleto largura={60} altura={16} />
      </div>
      <div className="flex justify-end">
        <Esqueleto largura={56} altura={16} />
      </div>
    </div>
  );
}

/** Tela 11b: o caminho, o título e a linha de andamento à vista; o resumo e a tabela em esqueleto. */
export function CarregandoResultado({
  consulta,
  aoCancelar,
}: Readonly<{
  consulta: Consulta;
  aoCancelar: () => void;
}>) {
  const { tempoLimiteSegundos } = useParametros();
  return (
    <>
      <Caminho niveis={[{ rotulo: tituloCurto(consulta) }]} />
      <h1 className="mt-4 text-4xl leading-11 font-bold tracking-[-0.01em]">
        {tituloConsulta(consulta)}
      </h1>
      <div className="mt-3">
        <LinhaStatus
          texto={textoCarregando(consulta, tempoLimiteSegundos)}
          aoCancelar={aoCancelar}
        />
      </div>

      <div
        aria-hidden="true"
        className="mt-6 grid grid-cols-2 gap-4 rounded-medio border border-borda px-5 py-4 md:grid-cols-4"
      >
        {BLOCOS_DO_RESUMO.map(([rotulo, valor]) => (
          <div key={`${rotulo}-${valor}`} className="flex flex-col gap-2">
            <Esqueleto largura={rotulo} altura={14} />
            <Esqueleto largura={valor} altura={28} />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="mt-6">
        <div className="flex flex-wrap gap-3">
          <Esqueleto largura={320} altura={44} />
          <Esqueleto largura={200} altura={44} />
        </div>
        <div className="mt-4 overflow-hidden rounded-medio border border-borda">
          <div className="border-b border-borda bg-superficie-sutil px-4 py-3">
            <Esqueleto largura="60%" altura={14} />
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              {LARGURAS_DAS_LINHAS.map(([cliente = "80%", fornecedor = "70%"]) => (
                <LinhaDoEsqueleto
                  key={`${cliente}-${fornecedor}`}
                  cliente={cliente}
                  fornecedor={fornecedor}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
