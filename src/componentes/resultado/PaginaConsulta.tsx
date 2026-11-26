"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { FormularioConsulta } from "@/componentes/consulta/FormularioConsulta";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { NenhumaVenda } from "@/componentes/estados/NenhumaVenda";
import { Caminho } from "@/componentes/moldura/Caminho";
import type { ResultadoConsulta } from "@/contrato/tipos";
import { marcarPendente } from "@/lib/armazenamento/pendentes";
import {
  type Consulta,
  chaveConsulta,
  escreverConsulta,
  lerConsulta,
} from "@/lib/consulta/consulta";
import {
  periodoAteCopia,
  rodapeErro,
  textoDadosAteSemVendas,
  textoPeriodoAteCopia,
  textoSemVendas,
  tituloCurto,
} from "@/lib/consulta/descricao";
import { formatarDiaMes } from "@/lib/formatacao";
import { formatarHora } from "@/lib/tempo";
import { CarregandoResultado } from "./CarregandoResultado";
import { ResultadoPeriodo } from "./ResultadoPeriodo";
import { useConsultaVendas } from "./useConsultaVendas";

// O formulário lê o erro uma vez: cada 422 ganha um número, que vira a `key` e o monta de novo.
const numeros = new WeakMap<object, number>();
let ultimoNumero = 0;
function numeroDe(objeto: object): number {
  let numero = numeros.get(objeto);
  if (numero === undefined) {
    ultimoNumero += 1;
    numero = ultimoNumero;
    numeros.set(objeto, numero);
  }
  return numero;
}

/** Telas 13 e 13b; na 13b, o botão consulta o mesmo número de dias terminando na data da cópia. */
function SemVendas({ consulta, resultado }: { consulta: Consulta; resultado: ResultadoConsulta }) {
  const roteador = useRouter();
  const ateCopia = periodoAteCopia(consulta, resultado.dadosDoSturAte);
  const complemento = [
    textoDadosAteSemVendas(consulta, resultado.dadosDoSturAte),
    ateCopia && textoPeriodoAteCopia(ateCopia),
  ]
    .filter(Boolean)
    .join(" ");

  const acaoExtra = ateCopia
    ? {
        rotulo:
          ateCopia.dias === 1
            ? `Consultar ${formatarDiaMes(ateCopia.ate)}`
            : `Consultar de ${formatarDiaMes(ateCopia.de)} a ${formatarDiaMes(ateCopia.ate)}`,
        aoClicar() {
          const nova = chaveConsulta({ ...consulta, de: ateCopia.de, ate: ateCopia.ate });
          marcarPendente(nova);
          roteador.push(nova);
        },
      }
    : undefined;

  return (
    <NenhumaVenda
      caminho={[{ rotulo: tituloCurto(consulta) }]}
      mensagem={textoSemVendas(consulta)}
      complemento={complemento === "" ? null : complemento}
      alterarHref={`/?${escreverConsulta(consulta)}`}
      acaoExtra={acaoExtra}
      consultadoAs={formatarHora(resultado.consultadoEm)}
    />
  );
}

/** `/consulta?…`: a consulta por período e os seus estados (1b, 1c, 11b, 12, 12b, 13, 13b). */
export function PaginaConsulta() {
  const parametros = useSearchParams();
  const consulta = useMemo(() => lerConsulta(parametros), [parametros]);
  const {
    estado,
    resultado,
    erro,
    atualizando,
    falhaAtualizar,
    tentadoAs,
    consultar,
    atualizar,
    cancelar,
  } = useConsultaVendas(consulta);
  const alterarHref = `/?${escreverConsulta(consulta)}`;

  switch (estado) {
    case "formulario-link":
      return <FormularioConsulta key="link" inicial={consulta} avisoLink aoConsultar={consultar} />;
    case "invalida":
      return erro ? (
        <FormularioConsulta
          key={`invalida-${numeroDe(erro)}`}
          inicial={consulta}
          erroInicial={{ campo: erro.campo, mensagem: erro.mensagem }}
          aoConsultar={consultar}
        />
      ) : null;
    case "carregando":
      return <CarregandoResultado consulta={consulta} aoCancelar={cancelar} />;
    case "resultado":
      return resultado ? (
        <ResultadoPeriodo
          consulta={consulta}
          resultado={resultado}
          atualizando={atualizando}
          falhaAtualizar={falhaAtualizar}
          aoAtualizar={atualizar}
        />
      ) : null;
    case "vazio":
      return resultado ? <SemVendas consulta={consulta} resultado={resultado} /> : null;
    case "erro":
      return erro ? (
        <>
          <Caminho niveis={[{ rotulo: tituloCurto(consulta) }]} />
          <EstadoErro
            erro={erro}
            rodape={rodapeErro(consulta, formatarHora(tentadoAs ?? new Date().toISOString()))}
            aoTentar={consultar}
            alterarHref={alterarHref}
          />
        </>
      ) : null;
    default:
      return null;
  }
}
