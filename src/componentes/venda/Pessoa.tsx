import type { VendaAgi } from "@/contrato/tipos";
import { camposSemMolde } from "@/lib/venda/moldes";
import { linhaDaPessoa } from "@/lib/venda/pessoas";
import { GrupoDeCampos, type NivelDeTitulo } from "./GrupoDeCampos";

/**
 * A pessoa do serviço `indice` (IA 6.5; Anexo B, seção 4): a linha do passageiro, hóspede, condutor
 * ou segurado e, recolhidos, "Documentos e contato" e "Viagem corporativa" (decisão 19). Em
 * Diversos sem nome, não há linha. `semLinha` é para o hotel e a locação, cujo card já traz a
 * pessoa como par.
 */
export function Pessoa({
  venda,
  indice,
  classificacao,
  localizador,
  nivel,
  semLinha = false,
}: Readonly<{
  venda: VendaAgi;
  indice: number;
  classificacao: string | null;
  localizador: string | null;
  nivel: NivelDeTitulo;
  semLinha?: boolean;
}>) {
  const servico = venda.detalheItem?.[indice];
  if (servico === undefined) return null;
  const linha = semLinha
    ? null
    : linhaDaPessoa(servico, classificacao, localizador, venda.nomeproduto ?? null);
  const grupo = (titulo: string, nome: string) => (
    <GrupoDeCampos
      titulo={titulo}
      campos={camposSemMolde(nome, ["pessoa"])}
      venda={venda}
      indices={[indice]}
      nivel={nivel}
      recolhido
      className="mt-1"
    />
  );

  return (
    <div data-anexo-secao="4" className="mt-6 empty:hidden">
      {linha !== null && <p className="text-[15px] leading-[22px] tabular-nums">{linha}</p>}
      {grupo("Documentos e contato", "Documentos e contato")}
      {grupo("Viagem corporativa", "Viagem corporativa")}
    </div>
  );
}
