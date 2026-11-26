/**
 * Datas nos textos da venda: dd/mm nas duas pontas e o ano só no fim, como o canvas. Quem chama
 * testa `preenchido` antes (a data vazia do Stur vira "—" em `formatarData`).
 */

import { unir } from "@/lib/consulta/descricao";
import { formatarData, formatarDiaMes } from "@/lib/formatacao";

function ano(dia: string): string {
  return dia.slice(0, 4);
}

/** "22/11", com o ano só quando ele difere do ano de `hoje` ("04/02/2027"). */
export function dataSolta(dia: string, hoje: string): string {
  return ano(dia) === ano(hoje) ? formatarDiaMes(dia) : formatarData(dia);
}

/** "15/11 a 22/11/2026"; anos diferentes, os dois; o mesmo dia, uma data; uma ponta nula, a outra. */
export function periodoCurto(de: string | null, ate: string | null): string | null {
  if (de === null || ate === null) {
    const uma = de ?? ate;
    return uma === null ? null : formatarData(uma);
  }
  if (de.slice(0, 10) === ate.slice(0, 10)) return formatarData(ate);
  const inicio = ano(de) === ano(ate) ? formatarDiaMes(de) : formatarData(de);
  return `${inicio} a ${formatarData(ate)}`;
}

/** "09/06, 30/06 e 10/11/2026": o ano no fim e em todo item de ano diferente do último. */
export function listaDeDatas(dias: string[]): string {
  const ultimo = dias.at(-1);
  if (ultimo === undefined) return "";
  return unir(
    dias.map((dia, i) =>
      i === dias.length - 1 || ano(dia) !== ano(ultimo) ? formatarData(dia) : formatarDiaMes(dia),
    ),
  );
}
