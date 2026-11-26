export type Tema = "claro" | "escuro" | "sistema";

const CHAVE = "stur-web:tema";

const ATRIBUTO: Record<Tema, "light" | "dark" | null> = {
  claro: "light",
  escuro: "dark",
  sistema: null,
};

function ehTema(valor: string | null): valor is Tema {
  return valor === "claro" || valor === "escuro" || valor === "sistema";
}

export function lerTema(): Tema {
  try {
    const salvo = window.localStorage.getItem(CHAVE);
    return ehTema(salvo) ? salvo : "sistema";
  } catch {
    return "sistema";
  }
}

export function aplicarTema(t: Tema, html: HTMLElement = document.documentElement): void {
  const atributo = ATRIBUTO[t];
  if (atributo === null) html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", atributo);
}

export function gravarTema(t: Tema): void {
  try {
    window.localStorage.setItem(CHAVE, t);
  } catch {
    // Sem armazenamento (janela privada, dados bloqueados): o tema vale só nesta página.
  }
  aplicarTema(t);
}

// O mesmo efeito de lerTema + aplicarTema, em JS puro, para rodar no <head> antes da pintura.
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE}");var h=document.documentElement;if(t==="claro")h.setAttribute("data-theme","light");else if(t==="escuro")h.setAttribute("data-theme","dark");else h.removeAttribute("data-theme")}catch(e){}})()`;
