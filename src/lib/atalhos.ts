"use client";

import { useEffect, useRef } from "react";

/** Atalhos de uma tecla não valem enquanto se digita, nem com Ctrl, Meta ou Alt. */
export function ignorarAtalho(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const alvo = e.target;
  if (!(alvo instanceof HTMLElement)) return false;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) return true;
  // O jsdom não implementa isContentEditable; o closest cobre os filhos do campo editável.
  return (
    alvo.isContentEditable ||
    alvo.closest('[contenteditable=""], [contenteditable="true"]') !== null
  );
}

/** Liga uma tecla ao documento; ao acionar, chama preventDefault para ela não entrar em campo. */
export function useAtalho(tecla: string, acao: () => void, ativo = true): void {
  const acaoAtual = useRef(acao);
  useEffect(() => {
    acaoAtual.current = acao;
  });

  useEffect(() => {
    if (!ativo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== tecla || ignorarAtalho(e)) return;
      e.preventDefault();
      acaoAtual.current();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [tecla, ativo]);
}
