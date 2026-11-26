"use client";

import { type ReactNode, useId, useState } from "react";
import { Pilula } from "@/componentes/comum/Pilula";
import { CLASSIFICACOES, type Consulta, SITUACOES, temFiltro } from "@/lib/consulta/consulta";
import { resumoMarcados } from "@/lib/consulta/descricao";
import {
  type OpcoesContadas,
  type Refinamentos,
  resumoRefinamentos,
  temRefinamento,
} from "@/lib/resultado/refinar";
import { cn } from "@/lib/utils";

const CAMPOS_DE_TEXTO = [
  { campo: "cliente", rotulo: "Cliente", limite: false },
  { campo: "fornecedor", rotulo: "Fornecedor", limite: false },
  { campo: "emissor", rotulo: "Emissor", limite: true },
] as const;

function alternar<T>(lista: readonly T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((i) => i !== item) : [...lista, item];
}

function GrupoDePilulas<T extends string>({
  titulo,
  opcoes,
  marcadas,
  aoAlternar,
}: {
  titulo: string;
  opcoes: { valor: T; rotulo: string; contagem?: number }[];
  marcadas: readonly T[];
  aoAlternar: (valor: T) => void;
}) {
  const idDoTitulo = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={idDoTitulo} className="text-sm font-semibold">
        {titulo}
      </span>
      <div role="group" aria-labelledby={idDoTitulo} className="flex flex-wrap gap-2">
        {opcoes.map(({ valor, rotulo, contagem }) => (
          <Pilula
            key={valor}
            pressionada={marcadas.includes(valor)}
            onClick={() => aoAlternar(valor)}
            className="gap-1.5"
          >
            {rotulo}
            {contagem !== undefined && (
              <>
                {" "}
                <span className="font-normal text-texto-auxiliar">{contagem}</span>
              </>
            )}
          </Pilula>
        ))}
      </div>
    </div>
  );
}

export type PropsDosFiltros =
  | {
      modo: "consulta";
      valor: Consulta;
      aoMudar: (consulta: Consulta) => void;
    }
  | {
      modo: "resultado";
      valor: Refinamentos;
      opcoes: OpcoesContadas;
      aoMudar: (refinamentos: Refinamentos) => void;
    };

/** Quadro recolhível: o estado aberto/fechado parte do valor inicial e depois é da pessoa. */
function Quadro({
  abertoNoInicio,
  titulo,
  resumo,
  children,
}: {
  abertoNoInicio: boolean;
  titulo: string;
  resumo: string;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(abertoNoInicio);
  return (
    <details
      open={aberto}
      onToggle={(evento) => setAberto(evento.currentTarget.open)}
      className="rounded-medio border border-borda px-6"
    >
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold">
        {titulo} <span className="font-normal text-texto-auxiliar">· {resumo}</span>
      </summary>
      <div className="flex flex-col gap-4 pt-1 pb-6">{children}</div>
    </details>
  );
}

const CLASSE_DO_CONTROLE =
  "h-alvo w-full rounded-pequeno border border-borda-controle bg-superficie px-4 text-base text-texto-principal placeholder:text-texto-auxiliar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

function FiltrosDaConsulta({
  valor,
  aoMudar,
}: {
  valor: Consulta;
  aoMudar: (consulta: Consulta) => void;
}) {
  const prefixo = useId();

  return (
    <Quadro
      abertoNoInicio={temFiltro(valor)}
      titulo="Filtros (opcionais, com número ou período)"
      resumo={resumoMarcados(valor)}
    >
      <GrupoDePilulas
        titulo="Situação no Stur"
        opcoes={SITUACOES}
        marcadas={valor.situacao}
        aoAlternar={(s) => aoMudar({ ...valor, situacao: alternar(valor.situacao, s) })}
      />
      <GrupoDePilulas
        titulo="Produto"
        opcoes={CLASSIFICACOES}
        marcadas={valor.classificacao}
        aoAlternar={(c) => aoMudar({ ...valor, classificacao: alternar(valor.classificacao, c) })}
      />
      <div className="flex flex-col gap-4">
        {CAMPOS_DE_TEXTO.map(({ campo, rotulo, limite }) => {
          const id = `${prefixo}-${campo}`;
          return (
            <div key={campo} className="flex min-w-0 flex-col gap-2">
              <label htmlFor={id} className="text-sm font-semibold">
                {rotulo}
              </label>
              <input
                id={id}
                autoComplete="off"
                placeholder="Nome ou parte do nome"
                value={valor[campo] ?? ""}
                onChange={(evento) =>
                  aoMudar({
                    ...valor,
                    [campo]: evento.target.value === "" ? null : evento.target.value,
                  })
                }
                className={cn(CLASSE_DO_CONTROLE, limite && "max-w-[300px]")}
              />
            </div>
          );
        })}
      </div>
      <p className="text-sm leading-5 text-texto-auxiliar">
        Sem marcar nada, vêm todas as vendas. Os campos aceitam parte do nome, e Fornecedor procura
        a operadora e também a companhia, o hotel ou a empresa de ônibus.
      </p>
      <p className="text-[13px] leading-5 text-estado-info">
        A consulta só vai à API do Stur quando você clica em Consultar. Depois, dá para refinar o
        resultado sem consultar de novo.
      </p>
      {temFiltro(valor) && (
        <button
          type="button"
          onClick={() =>
            aoMudar({
              ...valor,
              situacao: [],
              classificacao: [],
              fornecedor: null,
              cliente: null,
              emissor: null,
            })
          }
          className="h-alvo self-start cursor-pointer rounded-pilula border border-borda bg-transparent px-4 text-sm font-medium text-texto-principal outline-0 transition-colors duration-150 hover:bg-superficie-sutil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Limpar filtros
        </button>
      )}
    </Quadro>
  );
}

function ListaDeSelecao({
  rotulo,
  todos,
  total,
  opcoes,
  valor,
  aoEscolher,
  className,
}: {
  rotulo: string;
  todos: string;
  total: number;
  opcoes: [string, number][];
  valor: string | null;
  aoEscolher: (nome: string | null) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor ?? ""}
        onChange={(evento) => aoEscolher(evento.target.value === "" ? null : evento.target.value)}
        className={CLASSE_DO_CONTROLE}
      >
        <option value="">
          {todos} · {total}
        </option>
        {opcoes.map(([nome, n]) => (
          <option key={nome} value={nome}>
            {nome} · {n}
          </option>
        ))}
        {valor !== null && !opcoes.some(([nome]) => nome === valor) && (
          <option value={valor}>{valor} · 0</option>
        )}
      </select>
    </div>
  );
}

/** Só as opções presentes no resultado, com o rótulo e a contagem. */
function comContagem<T extends string>(
  rotulos: { valor: T; rotulo: string }[],
  contagens: [T, number][],
  marcadas: readonly T[],
) {
  const presentes = contagens.flatMap(([valor, contagem]) => {
    const achado = rotulos.find((r) => r.valor === valor);
    return achado ? [{ ...achado, contagem }] : [];
  });
  // Marcada que o resultado não tem (endereço antigo): continua visível, com 0, para desmarcar.
  const ausentes = rotulos
    .filter((r) => marcadas.includes(r.valor) && !presentes.some((p) => p.valor === r.valor))
    .map((r) => ({ ...r, contagem: 0 }));
  return [...presentes, ...ausentes];
}

function FiltrosDoResultado({
  valor,
  opcoes,
  aoMudar,
}: {
  valor: Refinamentos;
  opcoes: OpcoesContadas;
  aoMudar: (refinamentos: Refinamentos) => void;
}) {
  const lista = (
    campo: "cliente" | "fornecedor" | "emissor",
    rotulo: string,
    todos: string,
    className: string,
  ) => (
    <ListaDeSelecao
      rotulo={rotulo}
      todos={todos}
      total={opcoes.total}
      opcoes={opcoes[campo]}
      valor={valor[campo]}
      aoEscolher={(nome) => aoMudar({ ...valor, [campo]: nome })}
      className={className}
    />
  );

  return (
    <Quadro
      // A busca fica fora do quadro: ela sozinha não o abre.
      abertoNoInicio={temRefinamento({ ...valor, q: "" })}
      titulo="Refinar resultado"
      resumo={`situação, produto, cliente, fornecedor e emissor · ${resumoRefinamentos(valor)}`}
    >
      <GrupoDePilulas
        titulo="Situação no Stur"
        opcoes={comContagem(SITUACOES, opcoes.situacao, valor.situacao)}
        marcadas={valor.situacao}
        aoAlternar={(s) => aoMudar({ ...valor, situacao: alternar(valor.situacao, s) })}
      />
      <GrupoDePilulas
        titulo="Produto"
        opcoes={comContagem(CLASSIFICACOES, opcoes.produto, valor.produto)}
        marcadas={valor.produto}
        aoAlternar={(c) => aoMudar({ ...valor, produto: alternar(valor.produto, c) })}
      />
      <div className="flex flex-wrap gap-4">
        {lista("cliente", "Cliente", "Todos os clientes", "max-w-[520px] flex-[1_1_16rem]")}
        {lista(
          "fornecedor",
          "Fornecedor",
          "Todos os fornecedores",
          "max-w-[520px] flex-[1_1_16rem]",
        )}
      </div>
      {lista("emissor", "Emissor", "Todos os emissores", "max-w-[300px]")}
      {opcoes.naoFecham > 0 && (
        <Pilula
          pressionada={valor.soNaoFecham}
          onClick={() => aoMudar({ ...valor, soNaoFecham: !valor.soNaoFecham })}
          className="self-start"
        >
          Só as que não fecham
        </Pilula>
      )}
      <p className="text-sm leading-5 text-texto-auxiliar">
        Sem marcar nada, valem todas as vendas do resultado. Fornecedor acha a operadora e também a
        companhia, o hotel ou a empresa de ônibus.
      </p>
      <p className="text-[13px] leading-5 text-estado-info">
        Estes filtros refinam o resultado sem consultar a API do Stur de novo. Para trazer outro
        conjunto de vendas, use Alterar consulta.
      </p>
    </Quadro>
  );
}

/**
 * Filtros opcionais. No modo consulta: recolhido quando chega sem filtro, aberto quando chega
 * com algum; nada marcado vale todas as vendas, então não há pílula "Todas". No modo
 * resultado: refinam no navegador as vendas já consultadas.
 */
export function Filtros(props: PropsDosFiltros) {
  return props.modo === "consulta" ? (
    <FiltrosDaConsulta valor={props.valor} aoMudar={props.aoMudar} />
  ) : (
    <FiltrosDoResultado valor={props.valor} opcoes={props.opcoes} aoMudar={props.aoMudar} />
  );
}
