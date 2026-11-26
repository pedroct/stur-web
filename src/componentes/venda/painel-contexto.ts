"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { enderecoDaVenda, enderecoDoDadoCru, enderecoDoServico, type Rota } from "@/lib/venda/rota";

/**
 * Abre e fecha os painéis (serviço e dado cru) pelo histórico, pela decisão 20. Num arquivo à
 * parte para os componentes da venda o usarem sem import circular com a página.
 */
export interface PainelContexto {
  abrirServico(idreserva: number, k: number): void;
  abrirDadoCru(idreserva: number): void;
  trocarServico(k: number): void;
  trocarParaDadoCru(): void;
  fecharPainel(): void;
  painelAberto: boolean;
}

const nada = () => {};

export const PainelContexto = createContext<PainelContexto>({
  abrirServico: nada,
  abrirDadoCru: nada,
  trocarServico: nada,
  trocarParaDadoCru: nada,
  fecharPainel: nada,
  painelAberto: false,
});

export function usePainel(): PainelContexto {
  return useContext(PainelContexto);
}

// O painel abre por cima da venda: a página não rola para o topo.
const SEM_ROLAR = { scroll: false } as const;

/**
 * O valor que a `PaginaReservaVenda` fornece. A ref diz se o painel abriu nesta página: abrir faz
 * `push` e a marca; trocar faz `replace`, para Voltar fechar o painel; fechar faz `back()` com a
 * ref marcada, ou `replace` para a venda quando o painel veio por link direto ou recarga.
 */
export function useValorDoPainel(numero: number | null, rota: Rota | null): PainelContexto {
  const roteador = useRouter();
  const abriuAqui = useRef(false);
  const venda = rota?.tipo === "venda" ? rota.idreserva : null;
  const painelAberto = rota?.tipo === "venda" && rota.painel !== null;

  // Fechado por outro caminho (o Voltar do navegador), o próximo painel já não abriu aqui.
  useEffect(() => {
    if (!painelAberto) abriuAqui.current = false;
  }, [painelAberto]);

  return useMemo(() => {
    function naVenda(acao: (n: number, id: number) => void): void {
      if (numero !== null && venda !== null) acao(numero, venda);
    }
    return {
      painelAberto,
      abrirServico(idreserva, k) {
        if (numero === null) return;
        abriuAqui.current = true;
        roteador.push(enderecoDoServico(numero, idreserva, k), SEM_ROLAR);
      },
      abrirDadoCru(idreserva) {
        if (numero === null) return;
        abriuAqui.current = true;
        roteador.push(enderecoDoDadoCru(numero, idreserva), SEM_ROLAR);
      },
      trocarServico(k) {
        naVenda((n, id) => roteador.replace(enderecoDoServico(n, id, k), SEM_ROLAR));
      },
      trocarParaDadoCru() {
        naVenda((n, id) => roteador.replace(enderecoDoDadoCru(n, id), SEM_ROLAR));
      },
      fecharPainel() {
        if (abriuAqui.current) {
          abriuAqui.current = false;
          roteador.back();
          return;
        }
        naVenda((n, id) => roteador.replace(enderecoDaVenda(n, id), SEM_ROLAR));
      },
    };
  }, [numero, venda, painelAberto, roteador]);
}

/** Para onde o foco volta ao fechar um painel que veio por link direto (decisão 20). */
export function tituloDaVenda(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-titulo-venda]");
}
