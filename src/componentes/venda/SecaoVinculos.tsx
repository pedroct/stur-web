import Link from "next/link";
import { FOCO } from "@/componentes/comum/tabela";
import type { VendaConsultada } from "@/contrato/tipos";
import { cn } from "@/lib/utils";
import { preenchido } from "@/lib/venda/campos";
import { camposSemMolde } from "@/lib/venda/moldes";
import { enderecoDaVenda } from "@/lib/venda/rota";
import { GrupoDeCampos, type NivelDeTitulo, temCampos } from "./GrupoDeCampos";

const GRUPO = "Taxa fee, reembolso e documentos financeiros";
const LINK = cn(FOCO, "font-semibold underline underline-offset-2 hover:text-acao-primaria");

function texto(valor: string | null | undefined): string | null {
  return valor !== null && valor !== undefined && valor.trim() !== "" ? valor.trim() : null;
}

/** "venda {k} de {n}, {produto}"; as partes nulas somem (decisão 26). */
function textoDoFee(fee: NonNullable<VendaConsultada["vinculos"]["fee"]>): string {
  const posicao =
    fee.posicao !== null && fee.quantidade !== null
      ? `venda ${fee.posicao} de ${fee.quantidade}`
      : null;
  const partes = [posicao, texto(fee.produto)].filter((p) => p !== null);
  return partes.length === 0 ? "outra venda desta reserva" : partes.join(", ");
}

/** "Pedido de reembolso {SR}, {passageiro}" (IA 6.8). */
function textoDoReembolso(numeroSR: string | null, nomePax: string | null): string {
  const sr = texto(numeroSR);
  const pax = texto(nomePax);
  const doSR = sr === null ? "" : ` ${sr}`;
  const doPax = pax === null ? "" : `, ${pax}`;
  return `Pedido de reembolso${doSR}${doPax}`;
}

/**
 * Vínculos (IA 6.8; Anexo B, seção 7), só quando há: o fee, nos dois sentidos, com o link para a
 * outra venda da reserva (decisão 26; o aviso do topo já diz qual é o fee), os pedidos de
 * reembolso e os títulos a pagar e a receber, pelo grupo.
 */
export function SecaoVinculos({
  dados,
  nivelBase,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2 }>) {
  const { venda, calculos, vinculos } = dados;
  const comFee = preenchido(venda.idreservavinculadafee, "idreservavinculadafee");
  const reembolsos = vinculos.reembolsos;
  const titulos = camposSemMolde(GRUPO, ["vinculos"]);
  const comTitulos = temCampos(titulos, venda, calculos);
  if (!comFee && reembolsos.length === 0 && !comTitulos) return null;

  const Titulo = nivelBase === 1 ? "h2" : "h3";
  const fee = vinculos.fee;

  return (
    <section data-anexo-secao="7" className="mt-10">
      <Titulo className="text-xl leading-7 font-semibold">Vínculos</Titulo>
      {comFee && (
        <dl className="mt-3 grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-5">
          <dt className="text-texto-auxiliar">Venda de fee vinculada</dt>
          <dd>
            {fee === null ? (
              "uma venda que não está nesta reserva"
            ) : (
              <Link href={enderecoDaVenda(fee.numero, fee.idreserva)} className={LINK}>
                {textoDoFee(fee)}
              </Link>
            )}
          </dd>
        </dl>
      )}
      {reembolsos.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm leading-5">
          {reembolsos.map((r, i) => {
            const frase = textoDoReembolso(r.numeroSR, r.nomePax);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: o id do reembolso pode vir nulo e dois pedidos podem vir iguais; a posição desempata
              <li key={`${r.id ?? "sem-id"}-${i}`} className="flex min-h-alvo items-center">
                {r.venda === null ? (
                  frase
                ) : (
                  <Link href={enderecoDaVenda(r.venda.numero, r.venda.idreserva)} className={LINK}>
                    {frase}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <GrupoDeCampos
        titulo={GRUPO}
        semTitulo
        nivel={(nivelBase + 2) as NivelDeTitulo}
        campos={titulos}
        venda={venda}
        calculos={calculos}
        className="mt-4"
      />
    </section>
  );
}
