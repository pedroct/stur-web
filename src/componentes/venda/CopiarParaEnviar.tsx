"use client";

import { Copy } from "lucide-react";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { AvisoDaCopia } from "@/componentes/comum/AvisoDaCopia";
import { Button } from "@/componentes/ui/button";
import type { ReservaConsultada, VendaConsultada } from "@/contrato/tipos";
import { useCopiado } from "@/lib/copiar";
import {
  idDaVenda,
  linhaDoIncentivo,
  textoCopiadoIncentivo,
  textoCopiadoReserva,
  textoCopiadoVenda,
} from "@/lib/venda/copia";
import { enderecoDaReserva, enderecoDaVenda, enderecoDoServico, lerResto } from "@/lib/venda/rota";

/**
 * "Copiar para enviar" (IA 10.1): copia o texto de `texto()`, montado no clique, e diz "Copiado"
 * por 2 s, ou "Não foi possível copiar" se o navegador negar, também para o leitor de tela
 * (`AvisoDaCopia`). A `ajuda` fica logo abaixo e é a descrição do botão.
 */
export function CopiarParaEnviar({
  texto,
  ajuda,
}: Readonly<{ texto: () => string; ajuda: string }>) {
  const { copiado, falhou, copiar } = useCopiado();
  const idDaAjuda = useId();
  let rotulo = "Copiar para enviar";
  if (copiado) rotulo = "Copiado";
  else if (falhou) rotulo = "Não foi possível copiar";
  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={() => copiar(texto())} aria-describedby={idDaAjuda}>
        <Copy className="size-[18px]" aria-hidden="true" />
        {rotulo}
      </Button>
      <span id={idDaAjuda} className="text-right text-[13px] leading-5 text-texto-auxiliar">
        {ajuda}
      </span>
      <AvisoDaCopia copiado={copiado} falhou={falhou} />
    </div>
  );
}

/** A venda (ou o incentivo), com o link do serviço quando o painel de um serviço está aberto. */
export function CopiarDaVenda({ dados }: Readonly<{ dados: VendaConsultada }>) {
  const pathname = usePathname();
  const incentivo = dados.calculos.tipo === "incentivo";

  function texto(): string {
    const { numero } = dados.reserva;
    const id = idDaVenda(dados);
    const { origin } = window.location;
    if (incentivo) return textoCopiadoIncentivo(dados, origin + enderecoDaVenda(numero, id));
    const rota = lerResto(pathname.split("/").slice(3).filter(Boolean));
    const k = rota?.tipo === "venda" && rota.painel?.tipo === "servico" ? rota.painel.k : undefined;
    return k === undefined
      ? textoCopiadoVenda(dados, origin + enderecoDaVenda(numero, id))
      : textoCopiadoVenda(dados, origin + enderecoDoServico(numero, id, k), k);
  }

  return (
    <CopiarParaEnviar
      texto={texto}
      ajuda={
        incentivo
          ? `Copia o endereço e "${linhaDoIncentivo(dados)}"`
          : "Copia o endereço e um resumo desta venda, para colar numa mensagem"
      }
    />
  );
}

/** A reserva sem venda aberta. */
export function CopiarDaReserva({ dados }: Readonly<{ dados: ReservaConsultada }>) {
  return (
    <CopiarParaEnviar
      texto={() =>
        textoCopiadoReserva(dados, window.location.origin + enderecoDaReserva(dados.numero))
      }
      ajuda="Copia o endereço e um resumo desta reserva, para colar numa mensagem"
    />
  );
}
