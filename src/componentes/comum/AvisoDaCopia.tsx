/**
 * O resultado da cópia para o leitor de tela: a maioria não lê de novo o rótulo do botão em foco
 * quando ele muda para "Copiado". A região fica sempre na página, vazia até a cópia, para ser
 * anunciada quando o texto entra.
 */
export function AvisoDaCopia({ copiado, falhou }: Readonly<{ copiado: boolean; falhou: boolean }>) {
  let aviso = "";
  if (copiado) aviso = "Copiado";
  else if (falhou) aviso = "Não foi possível copiar";
  return (
    <span aria-live="polite" className="sr-only">
      {aviso}
    </span>
  );
}
