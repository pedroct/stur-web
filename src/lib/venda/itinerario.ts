/**
 * Os textos do itinerário aéreo e rodoviário (IA 6.10): a frase, as esperas e as estadias que o
 * backend calculou, e o que cada forma do itinerário mostra na tela. Os índices dos trajetos e das
 * esperas são posições na lista `trechos` da AGI.
 */

import type { Itinerario, TrechoAgi } from "@/contrato/tipos";
import { preenchido } from "./campos";
import { dataSolta, periodoCurto } from "./datas";

type Local = NonNullable<TrechoAgi["origem"]>;
export type Espera = Itinerario["trajetos"][number]["esperas"][number];
export type Estadia = Itinerario["estadias"][number];

const DATA_PARTIDA = "trechos[].dtPartida";
const HORA = /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/;

function texto(valor: string | null | undefined): string | null {
  return valor !== null && valor !== undefined && valor.trim() !== "" ? valor.trim() : null;
}

/** "Fortaleza (FOR)"; só a cidade ou só a sigla quando falta a outra; nulo sem nenhuma. */
export function textoDoLocal(local: Local | null | undefined): string | null {
  const cidade = texto(local?.cidade);
  const sigla = texto(local?.sigla);
  if (cidade !== null && sigla !== null) return `${cidade} (${sigla})`;
  return cidade ?? sigla;
}

function chaveDoLocal(local: Local): string | null {
  return texto(local.sigla) ?? texto(local.cidade);
}

/** Os lugares do itinerário na ordem: a primeira origem e o destino de cada trecho. */
function lugares(itinerario: Itinerario, trechos: TrechoAgi[]): Local[] {
  const lista: Local[] = [];
  for (const trajeto of itinerario.trajetos) {
    for (const indice of trajeto.trechos) {
      const { origem, destino } = trechos[indice] ?? {};
      const ultimo = lista.at(-1);
      if (origem && textoDoLocal(origem) !== null) {
        if (ultimo === undefined || chaveDoLocal(ultimo) !== chaveDoLocal(origem)) {
          lista.push(origem);
        }
      }
      if (destino && textoDoLocal(destino) !== null) lista.push(destino);
    }
  }
  return lista;
}

/** "A → B → C" com os trechos do trajeto, que a lista de datas mostra um por linha. */
export function rotaDoTrajeto(trajeto: Itinerario["trajetos"][number], trechos: TrechoAgi[]) {
  const doTrajeto: Itinerario = { forma: "sem_dados", trajetos: [trajeto], estadias: [] };
  return lugares(doTrajeto, trechos)
    .map(textoDoLocal)
    .filter((l) => l !== null)
    .join(" → ");
}

/**
 * "{Cidade} ({SIG}) → …, {data}, {só ida | ida e volta}", mais ", pela {empresa}" no rodoviário. É
 * ida e volta quando o último destino é a primeira origem; a data é a partida do primeiro trecho
 * ou o período entre a primeira e a última partida.
 */
export function fraseDoItinerario(
  itinerario: Itinerario,
  trechos: TrechoAgi[],
  empresa: string | null,
): string {
  const pontos = lugares(itinerario, trechos);
  const rota = pontos
    .map(textoDoLocal)
    .filter((l) => l !== null)
    .join(" → ");
  const primeiro = pontos[0];
  const ultimo = pontos.at(-1);
  const voltou =
    pontos.length > 1 &&
    primeiro !== undefined &&
    ultimo !== undefined &&
    chaveDoLocal(primeiro) === chaveDoLocal(ultimo);

  const partidas = itinerario.trajetos
    .flatMap((t) => t.trechos.map((i) => trechos[i]?.dtPartida))
    .filter((d): d is string => d !== null && d !== undefined && preenchido(d, DATA_PARTIDA));
  const data = periodoCurto(partidas[0] ?? null, partidas.at(-1) ?? null);

  return [
    rota,
    data,
    voltou ? "ida e volta" : "só ida",
    empresa === null ? null : `pela ${empresa}`,
  ]
    .filter((parte) => parte !== null && parte !== "")
    .join(", ");
}

/** "Espera de 3h10 em Rio de Janeiro (GIG)": a cidade é a do destino do trecho que antecede. */
export function esperaEmTexto(espera: Espera, trechos: TrechoAgi[]): string {
  const horas = Math.floor(espera.minutos / 60);
  const minutos = String(espera.minutos % 60).padStart(2, "0");
  const cidade = texto(trechos[espera.aposTrecho]?.destino?.cidade);
  const sigla = texto(espera.aeroporto);
  const onde = cidade !== null && sigla !== null ? `${cidade} (${sigla})` : (cidade ?? sigla ?? "");
  return `Espera de ${horas}h${minutos} em ${onde}`;
}

/** "8 dias em Roma"; sem a cidade, a sigla. */
export function estadiaEmTexto(estadia: Estadia): string {
  const cidade = texto(estadia.cidade) ?? estadia.sigla;
  return `${estadia.dias} ${estadia.dias === 1 ? "dia" : "dias"} em ${cidade}`;
}

/** O localizador do primeiro trecho que tiver um. */
export function primeiroLocalizador(trechos: TrechoAgi[]): string | null {
  for (const t of trechos) {
    const localizador = texto(t.localizador);
    if (localizador !== null) return localizador;
  }
  return null;
}

/** "26/11 · 09h00": o ano só quando difere do de `hoje`, e sem a hora à meia-noite (sem horário). */
export function momentoDoTrecho(
  valor: string | null | undefined,
  caminho: string,
  hoje: string,
): string | null {
  if (valor === null || valor === undefined || !preenchido(valor, caminho)) return null;
  const dia = dataSolta(valor, hoje);
  const hora = HORA.exec(valor);
  if (hora === null || (hora[1] === "00" && hora[2] === "00")) return dia;
  return `${dia} · ${hora[1]}h${hora[2]}`;
}

const DOS_LOCAIS = [
  "trechos[].origem.sigla",
  "trechos[].origem.cidade",
  "trechos[].destino.sigla",
  "trechos[].destino.cidade",
];

/**
 * Os campos do Anexo B que cada forma do itinerário mostra: a frase mostra os locais; a lista de
 * datas, a partida; a tabela, o resto (no rodoviário, sem voo, companhia, classe e base tarifária).
 * O que fica de fora vai para o grupo, pela cobertura do Anexo B.
 */
export function caminhosEmTela(forma: Itinerario["forma"], rodoviario: boolean): Set<string> {
  const mostrados = new Set(DOS_LOCAIS);
  if (forma === "sem_dados") return mostrados;
  mostrados.add(DATA_PARTIDA);
  if (forma === "so_datas") return mostrados;
  for (const caminho of [
    "trechos[].origem.aeroporto",
    "trechos[].destino.aeroporto",
    "trechos[].dtChegada",
    "trechos[].localizador",
  ]) {
    mostrados.add(caminho);
  }
  if (!rodoviario) {
    for (const caminho of ["trechos[].cia", "trechos[].voo", "trechos[].classe"]) {
      mostrados.add(caminho);
    }
    mostrados.add("trechos[].farebase");
  }
  return mostrados;
}
