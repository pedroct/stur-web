import type { VendaConsultada } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { formatarData, formatarHoraDoStur } from "@/lib/formatacao";
import { preenchido } from "@/lib/venda/campos";
import { periodoCurto, periodoSomado } from "@/lib/venda/datas";
import { camposSemMolde } from "@/lib/venda/moldes";
import type { NivelDeTitulo } from "./GrupoDeCampos";
import {
  type ParDoCartao,
  ParesDoCartao,
  parDaPessoa,
  RestoDoGrupo,
  SecaoDoProduto,
  texto,
} from "./produto-comum";

/**
 * Data, hora e local da retirada ou da devolução, sem as partes vazias. Pela regra do vazio,
 * `1899-12-30T00:00:00` some, e `1899-12-30` com outra hora mostra só a hora.
 */
function momentoDoVeiculo(
  dia: string | null | undefined,
  hora: string | null | undefined,
  local: string | null | undefined,
  caminhos: { dia: string; hora: string },
): string | null {
  const partes = [
    preenchido(dia, caminhos.dia) && dia ? formatarData(dia) : null,
    preenchido(hora, caminhos.hora) && hora ? formatarHoraDoStur(hora) : null,
    texto(local),
  ].filter((parte) => parte !== null);
  return partes.length === 0 ? null : partes.join(" · ");
}

/**
 * O veículo (IA 6.4; tela 9): o veículo, o período com as diárias e a retirada, a devolução, o
 * condutor, a confirmação da locadora e o voucher. Com vários serviços, o card mostra só o que vale
 * para a venda: o veículo, quando é o mesmo em todos, e o período somado; o resto de cada serviço
 * fica na tabela e no painel dele (decisão 22).
 */
export function Veiculo({
  dados,
  nivelBase,
  comPessoa,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2; comPessoa: boolean }>) {
  const { venda, calculos } = dados;
  const servico = venda.detalheItem?.[0];
  if (servico === undefined) return null;
  const cancelada = situacaoDe(venda.status ?? null) === "cancelada";
  const servicos = venda.detalheItem ?? [];
  if (servicos.length > 1) {
    const datas = (campo: "dtRetirada" | "dtDevolucao") =>
      servicos.flatMap((s) => {
        const dia = s[campo];
        return preenchido(dia, `detalheItem[].${campo}`) && dia ? [dia] : [];
      });
    const veiculos = new Set(servicos.map((s) => texto(s.veiculo)));
    const [unico] = veiculos;
    const linha = [
      periodoSomado(datas("dtRetirada"), datas("dtDevolucao")),
      cancelada ? "não vai acontecer" : null,
    ]
      .filter((parte) => parte !== null)
      .join(" · ");
    return (
      <SecaoDoProduto titulo="Veículo" nivelBase={nivelBase} cartao>
        {veiculos.size === 1 && unico !== null && unico !== undefined && (
          <p className="text-base leading-6 font-semibold">{unico}</p>
        )}
        {linha !== "" && <p className="mt-0.5 text-base leading-6 tabular-nums">{linha}</p>}
      </SecaoDoProduto>
    );
  }

  const retirada = servico.dtRetirada ?? null;
  const devolucao = servico.dtDevolucao ?? null;
  const periodo = periodoCurto(
    preenchido(retirada, "detalheItem[].dtRetirada") ? retirada : null,
    preenchido(devolucao, "detalheItem[].dtDevolucao") ? devolucao : null,
  );
  const diarias = servico.qtdeDiarias;
  const linhaDoPeriodo = [
    periodo,
    diarias === null || diarias === undefined
      ? null
      : `${diarias} ${diarias === 1 ? "diária" : "diárias"}`,
    cancelada ? "não vai acontecer" : null,
  ]
    .filter((parte) => parte !== null)
    .join(" · ");

  const condutor = comPessoa ? parDaPessoa(venda, servico) : null;
  const candidatos: [string, string | null][] = [
    [
      "Retirada",
      momentoDoVeiculo(servico.dtRetirada, servico.horaRetirada, servico.localRetirada, {
        dia: "detalheItem[].dtRetirada",
        hora: "detalheItem[].horaRetirada",
      }),
    ],
    [
      "Devolução",
      momentoDoVeiculo(servico.dtDevolucao, servico.horaDevolucao, servico.localDevolucao, {
        dia: "detalheItem[].dtDevolucao",
        hora: "detalheItem[].horaDevolucao",
      }),
    ],
  ];
  const depois: [string, string | null][] = [
    ["Confirmação da locadora", texto(servico.numerodeconfirmacao)],
    ["Voucher", texto(servico.numeroVC)],
  ];
  const comoPares = (lista: [string, string | null][]): ParDoCartao[] =>
    lista.flatMap(([rotulo, valor]) => (valor === null ? [] : [{ rotulo, valor }]));
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  const veiculo = texto(servico.veiculo);

  return (
    <SecaoDoProduto titulo="Veículo" nivelBase={nivelBase} cartao>
      {veiculo !== null && <p className="text-base leading-6 font-semibold">{veiculo}</p>}
      {linhaDoPeriodo !== "" && (
        <p className="mt-0.5 text-base leading-6 tabular-nums">{linhaDoPeriodo}</p>
      )}
      <ParesDoCartao
        pares={[
          ...comoPares(candidatos),
          ...(condutor === null ? [] : [condutor]),
          ...comoPares(depois),
        ]}
      />
      <p className="mt-3 text-[13px] leading-5 text-texto-auxiliar">Horários locais.</p>
      <RestoDoGrupo
        grupo="Veículo (locação)"
        campos={camposSemMolde("Veículo (locação)", ["veiculo"])}
        venda={venda}
        calculos={calculos}
        indices={[0]}
        nivel={nivel}
      />
      <RestoDoGrupo
        grupo="Confirmação do fornecedor"
        campos={camposSemMolde("Confirmação do fornecedor", ["veiculo"])}
        venda={venda}
        calculos={calculos}
        indices={[0]}
        nivel={nivel}
      />
    </SecaoDoProduto>
  );
}
