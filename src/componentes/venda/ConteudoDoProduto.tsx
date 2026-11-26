import type { VendaConsultada } from "@/contrato/tipos";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { diaEmFortaleza } from "@/lib/tempo";
import { Hospedagem } from "./Hospedagem";
import { SecaoDoProduto } from "./produto-comum";
import { SecaoItinerario } from "./SecaoItinerario";
import { TabelaServicos } from "./TabelaServicos";
import { Veiculo } from "./Veiculo";

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
        </>
      )}
    </>
  );
}
