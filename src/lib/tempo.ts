/** Instantes do backend (ISO com fuso) mostrados em America/Fortaleza. */

const FUSO = "America/Fortaleza";

const PARTES = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partes(data: Date): Record<string, string> {
  return Object.fromEntries(PARTES.formatToParts(data).map(({ type, value }) => [type, value]));
}

/** O ECMAScript só garante a leitura com milissegundos e o backend manda 6 casas: corta para 3. */
function lerInstante(instante: string): Date {
  const data = new Date(
    instante.replace(/\.(\d+)/, (_, fracao: string) => `.${fracao.padEnd(3, "0").slice(0, 3)}`),
  );
  if (Number.isNaN(data.getTime())) throw new Error(`Instante inválido: ${instante}`);
  return data;
}

/** `"22h48"` */
export function formatarHora(instante: string): string {
  const p = partes(lerInstante(instante));
  return `${p.hour}h${p.minute}`;
}

/** `"24/11/2026 às 22:48"` */
export function formatarInstante(instante: string): string {
  const p = partes(lerInstante(instante));
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

/** Dia (`aaaa-mm-dd`) em que o instante cai em Fortaleza. */
export function diaEmFortaleza(instante: string): string {
  return hojeEmFortaleza(lerInstante(instante));
}

/** Dia (`aaaa-mm-dd`) de `agora` em Fortaleza. */
export function hojeEmFortaleza(agora: Date): string {
  const p = partes(agora);
  return `${p.year}-${p.month}-${p.day}`;
}
