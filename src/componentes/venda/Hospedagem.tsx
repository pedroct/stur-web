import type { VendaConsultada } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { unir } from "@/lib/consulta/descricao";
import { fornecedoresDe, preenchido } from "@/lib/venda/campos";
import { caminhosDaConta } from "@/lib/venda/conta";
import { periodoCurto } from "@/lib/venda/datas";
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
 * A hospedagem do primeiro serviço (IA 6.4; tela 3): o hotel, o período com as diárias e os pares
 * do canvas. Com vários serviços, a tabela lista os hóspedes e o card não traz o hóspede.
 */
export function Hospedagem({
  dados,
  nivelBase,
  comPessoa,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2; comPessoa: boolean }>) {
  const { venda, calculos } = dados;
  const servico = venda.detalheItem?.[0];
  if (servico === undefined) return null;
  const hotel = fornecedoresDe(texto(venda.nomefornec), texto(venda.nomefornec2)).principal;
  const cancelada = situacaoDe(venda.status ?? null) === "cancelada";

  const apartamentos = servico.apartamentos ?? [];
  const diarias = [
    ...new Set(
      apartamentos.flatMap((a) =>
        a.qtdeDiarias !== null && a.qtdeDiarias !== undefined ? [a.qtdeDiarias] : [],
      ),
    ),
  ];
  const entrada = servico.dtEntrada ?? null;
  const saida = servico.dtSaida ?? null;
  const periodo = periodoCurto(
    preenchido(entrada, "detalheItem[].dtEntrada") ? entrada : null,
    preenchido(saida, "detalheItem[].dtSaida") ? saida : null,
  );
  const linhaDoPeriodo = [
    periodo,
    diarias.length === 0
      ? null
      : `${unir(diarias.map(String))} ${diarias.length === 1 && diarias[0] === 1 ? "diária" : "diárias"}`,
    cancelada ? "não vai acontecer" : null,
  ]
    .filter((parte) => parte !== null)
    .join(" · ");

  const categoria = texto(servico.categHotel);
  const apartamento = [
    ...apartamentos.map((a) => texto(a.tipoApartamento)),
    categoria === null ? null : `categoria ${categoria}`,
  ]
    .filter((parte) => parte !== null)
    .join(" · ");
  const hospede = comPessoa ? parDaPessoa(venda, servico) : null;
  const candidatos: [string, string | null][] = [
    ["Apartamento", apartamento === "" ? null : apartamento],
    ["Regime", texto(servico.regime)],
    ["Acomodação", texto(servico.acomodacoesePassageiros)],
  ];
  const pares: ParDoCartao[] = [
    ...candidatos.flatMap(([rotulo, valor]) => (valor === null ? [] : [{ rotulo, valor }])),
    ...(hospede === null ? [] : [hospede]),
    ...((): ParDoCartao[] => {
      const confirmacao = texto(servico.numerodeconfirmacao);
      const voucher = texto(servico.numeroVC);
      return [
        ...(confirmacao === null ? [] : [{ rotulo: "Confirmação do hotel", valor: confirmacao }]),
        ...(voucher === null ? [] : [{ rotulo: "Voucher", valor: voucher }]),
      ];
    })(),
  ];
  const nivel = (nivelBase + 2) as NivelDeTitulo;
  // Com vários serviços, o resto de cada um fica no painel dele (decisão 22). Com um só, a conta
  // está na mesma página: o que ela mostra (a diária, a de balcão) não se repete aqui.
  const umServico = (venda.detalheItem ?? []).length === 1;
  const [conta] = calculos.servicos;
  const naConta =
    conta === undefined
      ? new Set<string>()
      : caminhosDaConta(conta, servico, venda.classificacaoproduto ?? null);

  return (
    <SecaoDoProduto titulo="Hospedagem" nivelBase={nivelBase}>
      {hotel !== null && <p className="mt-2 text-base leading-6 font-semibold">{hotel}</p>}
      {linhaDoPeriodo !== "" && (
        <p className="mt-0.5 text-base leading-6 tabular-nums">{linhaDoPeriodo}</p>
      )}
      <ParesDoCartao pares={pares} />
      {umServico && (
        <>
          <RestoDoGrupo
            grupo="Hospedagem (hotelaria)"
            campos={camposSemMolde("Hospedagem (hotelaria)", ["hospedagem"]).filter(
              (c) => !naConta.has(c.caminho),
            )}
            venda={venda}
            calculos={calculos}
            indices={[0]}
            nivel={nivel}
          />
          <RestoDoGrupo
            grupo="Confirmação do fornecedor"
            campos={camposSemMolde("Confirmação do fornecedor", ["hospedagem"])}
            venda={venda}
            calculos={calculos}
            indices={[0]}
            nivel={nivel}
          />
        </>
      )}
    </SecaoDoProduto>
  );
}
