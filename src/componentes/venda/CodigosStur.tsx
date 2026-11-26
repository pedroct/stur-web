import type { VendaConsultada } from "@/contrato/tipos";
import { CODIGOS_DO_STUR } from "@/lib/venda/campos";
import { camposSemMolde } from "@/lib/venda/moldes";
import { paresComItem } from "./GrupoDeCampos";
import { ListaDePares, SecaoRecolhida } from "./MaisDetalhes";

/**
 * "Códigos do Stur · para diagnóstico" (IA 6.9; Anexo B, seção 9), recolhido, no fim: os pares do
 * canvas, com o único lugar do `idreserva` na tela; com o rótulo do Anexo B, os códigos que esses
 * pares não usam, um par por item de lista; e os campos novos da API, pelos caminhos (decisão 9).
 */
export function CodigosStur({
  dados,
  nivelBase,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2 }>) {
  const { venda, camposDesconhecidos } = dados;
  const pares = CODIGOS_DO_STUR.flatMap(({ grupo, pares: doCanvas }) => [
    ...doCanvas.flatMap((p) => {
      const valor = p.valor(venda);
      return valor === null ? [] : [{ rotulo: p.rotulo(venda), valor }];
    }),
    ...paresComItem(camposSemMolde(grupo, ["codigos"]), venda),
  ]);
  const novos =
    camposDesconhecidos.length === 0
      ? []
      : [{ rotulo: "Campos novos da API", valor: camposDesconhecidos.join(", ") }];

  return (
    <SecaoRecolhida
      secao={9}
      nivelBase={nivelBase}
      titulo={
        <>
          Códigos do Stur{" "}
          <span className="text-sm font-normal text-texto-auxiliar">· para diagnóstico</span>
        </>
      }
    >
      <ListaDePares pares={[...pares, ...novos]} mono />
    </SecaoRecolhida>
  );
}
