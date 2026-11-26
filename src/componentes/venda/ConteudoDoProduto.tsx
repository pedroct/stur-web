import type { VendaConsultada } from "@/contrato/tipos";
import { type Classificacao, classificacaoDe } from "@/lib/consulta/consulta";
import { diaEmFortaleza } from "@/lib/tempo";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { GrupoDeCampos, type NivelDeTitulo, temCampos } from "./GrupoDeCampos";
import { Hospedagem } from "./Hospedagem";
import { GRUPOS_DO_SERVICO_DA_SECAO_3, nomeDoGrupo, SecaoDoProduto } from "./produto-comum";
import { SecaoItinerario } from "./SecaoItinerario";
import { TabelaServicos } from "./TabelaServicos";
import { Veiculo } from "./Veiculo";

/** Os grupos da seção 3 que o molde de cada classificação já mostra na página (com um serviço). */
const DO_MOLDE: Record<Classificacao, string[]> = {
  hotelaria: ["Hospedagem (hotelaria)", "Confirmação do fornecedor"],
  locacao: ["Veículo (locação)", "Confirmação do fornecedor"],
  diversos: ["Itens (diversos e pacote)", "Confirmação do fornecedor"],
  pacote: ["Itens (diversos e pacote)", "Confirmação do fornecedor"],
  aereo: [],
  rodoviario: [],
};

/**
 * Com um serviço só, os grupos da seção 3 que o molde da classificação não mostra (a quantidade
 * numa hospedagem, a confirmação num aéreo), pelo `GrupoDeCampos`, com o nome do grupo no Anexo B.
 * Sem campo preenchido, não aparecem.
 */
function OutrosGruposDoServico({
  dados,
  classificacao,
  nivelBase,
}: Readonly<{ dados: VendaConsultada; classificacao: Classificacao; nivelBase: 1 | 2 }>) {
  const { venda, calculos } = dados;
  const grupos = GRUPOS_DO_SERVICO_DA_SECAO_3.filter(
    (g) => !DO_MOLDE[classificacao].includes(g),
  ).flatMap((grupo) => {
    const campos = CAMPOS_ANEXO_B.filter((c) => c.grupo === grupo && !c.conteiner);
    return temCampos(campos, venda, calculos, [0]) ? [{ grupo, campos }] : [];
  });
  if (grupos.length === 0) return null;
  return (
    <div data-anexo-secao="3">
      {grupos.map(({ grupo, campos }) => {
        const comuns = { titulo: nomeDoGrupo(grupo), venda, calculos, indices: [0] };
        return (
          <div key={grupo}>
            <GrupoDeCampos
              campos={campos.filter((c) => c.aparece !== "recolhido")}
              nivel={(nivelBase + 1) as NivelDeTitulo}
              className="mt-10"
              {...comuns}
            />
            <GrupoDeCampos
              campos={campos.filter((c) => c.aparece === "recolhido")}
              nivel={(nivelBase + 2) as NivelDeTitulo}
              recolhido
              className="mt-2"
              {...comuns}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * O conteúdo do produto (IA 6.4; Anexo B, seção 3): o molde pela classificação. O itinerário vem
 * antes, em qualquer classificação, quando há trechos; depois a hospedagem ou o veículo; e a
 * tabela de serviços em Diversos e Pacote e, nas outras, quando há mais de um serviço.
 */
export function ConteudoDoProduto({
  dados,
  nivelBase = 1,
}: Readonly<{ dados: VendaConsultada; nivelBase?: 1 | 2 }>) {
  const { venda } = dados;
  const classificacao = classificacaoDe(venda.classificacaoproduto ?? null) ?? "diversos";
  const servicos = venda.detalheItem ?? [];
  const hoje = diaEmFortaleza(dados.consultadoEm);
  const comPessoa = servicos.length === 1;
  const tabela = classificacao === "diversos" || classificacao === "pacote" || servicos.length > 1;

  return (
    <>
      <SecaoItinerario
        dados={dados}
        classificacao={classificacao}
        hoje={hoje}
        nivelBase={nivelBase}
      />
      {servicos.length === 0 ? (
        <SecaoDoProduto titulo="Serviços" nivelBase={nivelBase}>
          <p className="mt-2 text-sm leading-5 text-texto-auxiliar">
            A API não trouxe nenhum serviço nesta venda.
          </p>
        </SecaoDoProduto>
      ) : (
        <>
          {classificacao === "hotelaria" && (
            <Hospedagem dados={dados} nivelBase={nivelBase} comPessoa={comPessoa} />
          )}
          {classificacao === "locacao" && (
            <Veiculo dados={dados} nivelBase={nivelBase} comPessoa={comPessoa} />
          )}
          {tabela && (
            <TabelaServicos dados={dados} classificacao={classificacao} nivelBase={nivelBase} />
          )}
          {servicos.length === 1 && (
            <OutrosGruposDoServico
              dados={dados}
              classificacao={classificacao}
              nivelBase={nivelBase}
            />
          )}
        </>
      )}
    </>
  );
}
