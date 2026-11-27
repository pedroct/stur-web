"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Quanto tempo o botão diz "Copiado" (ou que não foi possível copiar) antes de voltar ao rótulo. */
export const COPIADO_POR_MS = 2000;

type Situacao = "ocioso" | "copiado" | "falhou";

/**
 * Copia um texto para a área de transferência e guarda o resultado por `COPIADO_POR_MS`:
 * `copiado` quando deu certo, `falhou` quando o navegador negou ou não tem a área de
 * transferência. Quem usa decide o que mostrar nos dois casos.
 */
export function useCopiado(): {
  copiado: boolean;
  falhou: boolean;
  copiar(texto: string): Promise<void>;
} {
  const [situacao, setSituacao] = useState<Situacao>("ocioso");
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Começa verdadeiro: o efeito só roda depois da primeira pintura, e um clique pode chegar antes.
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      if (espera.current !== null) clearTimeout(espera.current);
    };
  }, []);

  const copiar = useCallback(async (texto: string) => {
    let resultado: Situacao = "copiado";
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      resultado = "falhou";
    }
    if (!montado.current) return;
    if (espera.current !== null) clearTimeout(espera.current);
    setSituacao(resultado);
    espera.current = setTimeout(() => {
      espera.current = null;
      setSituacao("ocioso");
    }, COPIADO_POR_MS);
  }, []);

  return { copiado: situacao === "copiado", falhou: situacao === "falhou", copiar };
}
