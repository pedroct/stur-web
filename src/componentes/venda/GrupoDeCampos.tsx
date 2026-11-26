import { ChevronRight } from "lucide-react";
import type { CalculosVenda, VendaAgi } from "@/contrato/tipos";
import { compararDecimais, ehDecimal } from "@/lib/decimal";
import {
  formatarCambio,
  formatarData,
  formatarDataHora,
  formatarHoraDoStur,
  formatarPercentualTermo,
  formatarValor,
} from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { CampoAnexo } from "@/lib/venda/anexo-b";
import { preenchido, valorDoCampo } from "@/lib/venda/campos";

export type NivelDeTitulo = 2 | 3 | 4 | 5;

/** Decimal em texto formatado; o que não for decimal aparece como veio, em vez de quebrar a tela. */
function comoDecimal(valor: unknown, formatar: (texto: string) => string): string {
  return typeof valor === "string" && ehDecimal(valor) ? formatar(valor) : String(valor);
}

/**
 * O valor de um campo do Anexo B como a tela o mostra, pelo `formato` (Global Constraints,
 * "Formatação no GrupoDeCampos"). `sigla` vai antes do dinheiro nos campos `…MoedaOriginal`.
 */
export function formatarCampo(
  campo: Pick<CampoAnexo, "caminho" | "formato">,
  valor: unknown,
  sigla: string | null = null,
): string {
  switch (campo.formato) {
    case "dinheiro": {
      const dinheiro = comoDecimal(valor, formatarValor);
      return sigla === null ? dinheiro : `${sigla} ${dinheiro}`;
    }
    case "percentual":
      return comoDecimal(valor, formatarPercentualTermo);
    case "cambio":
      return comoDecimal(valor, formatarCambio);
    case "data":
      return formatarData(String(valor));
    case "dataHora":
      return formatarDataHora(String(valor));
    case "hora":
      return formatarHoraDoStur(String(valor));
    case "booleano":
      return valor === true ? "Sim" : "Não";
    case "lista":
      return Array.isArray(valor) ? valor.map(String).join("; ") : String(valor);
    case "inteiro":
    case "texto":
      return String(valor);
  }
}

type Moeda = { mostrar: boolean; sigla: string | null };
const SEM_MOEDA: Moeda = { mostrar: false, sigla: null };
const MOEDA_REAL = new Set(["R$", "BRL"]);

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

/** Num lançamento, a sigla não é real e o câmbio não é 1 (Global Constraints, "Moeda estrangeira"). */
function moedaDoLancamento(campo: CampoAnexo, venda: VendaAgi, indices: number[]): Moeda {
  const base = campo.caminho.slice(0, campo.caminho.lastIndexOf(".") + 1);
  const sigla = texto(valorDoCampo(venda, `${base}moedaOriginal`, indices));
  if (sigla === null || MOEDA_REAL.has(sigla.replace(/\s/g, "").toUpperCase())) return SEM_MOEDA;
  const cambio = valorDoCampo(venda, `${base}vlrCambio`, indices);
  const ehUm =
    typeof cambio === "string" && ehDecimal(cambio) && compararDecimais(cambio, "1") === 0;
  return ehUm ? SEM_MOEDA : { mostrar: true, sigla };
}

/** Num serviço, a conversão do lado (a do cliente, para o que não é de um lado só) não é nula. */
function moedaDoServico(
  campo: CampoAnexo,
  venda: VendaAgi,
  calculos: CalculosVenda | undefined,
  indices: number[],
): Moeda {
  const [indice] = indices;
  if (calculos === undefined || indice === undefined) return SEM_MOEDA;
  const lado = campo.rotulo.startsWith("Fornecedor:") ? "fornecedor" : "cliente";
  const conversao = calculos.servicos.find((s) => s.indice === indice)?.[lado].conversao;
  if (conversao === null || conversao === undefined) return SEM_MOEDA;
  const sigla = valorDoCampo(
    venda,
    lado === "fornecedor" ? "detalheItem[].siglaMoedaTarifap" : "detalheItem[].siglaMoedaTarifa",
    indices,
  );
  return { mostrar: true, sigla: texto(sigla) ?? conversao.sigla };
}

function moedaDoCampo(
  campo: CampoAnexo,
  venda: VendaAgi,
  calculos: CalculosVenda | undefined,
  indices: number[],
): Moeda {
  if (campo.caminho.startsWith("detalheItem[].")) {
    return moedaDoServico(campo, venda, calculos, indices);
  }
  if (/^(recebimentos|pagamentos)\[\]\./.test(campo.caminho)) {
    return moedaDoLancamento(campo, venda, indices);
  }
  return SEM_MOEDA;
}

/** A moeda original de um valor em dinheiro leva a sigla antes; o campo da sigla, não. */
function levaSigla(campo: CampoAnexo): boolean {
  return campo.formato === "dinheiro" && campo.caminho.endsWith("MoedaOriginal");
}

type Par = { rotulo: string; valor: string; bloco: string };

/** Os índices de cada item das listas que `indices` não cobre: um por combinação de itens. */
function itensDasListas(venda: VendaAgi, caminho: string, indices: number[]): number[][] {
  const partes = caminho.split(".");
  let combinacoes: number[][] = [indices.slice(0, 0)];
  let usados = 0;
  let prefixo = "";
  for (const parte of partes) {
    prefixo = prefixo === "" ? parte : `${prefixo}.${parte}`;
    if (!parte.endsWith("[]")) continue;
    const fornecido = indices[usados];
    usados += 1;
    if (fornecido !== undefined) {
      combinacoes = combinacoes.map((c) => [...c, fornecido]);
      continue;
    }
    const lista = prefixo.slice(0, -2);
    combinacoes = combinacoes.flatMap((c) => {
      const itens = valorDoCampo(venda, lista, c);
      return Array.isArray(itens) ? itens.map((_, k) => [...c, k]) : [];
    });
  }
  return combinacoes;
}

function paresDoGrupo(
  campos: CampoAnexo[],
  venda: VendaAgi,
  calculos: CalculosVenda | undefined,
  indices: number[],
): Par[] {
  return campos.flatMap((campo) => {
    const ultimaLista = campo.caminho.lastIndexOf("[]");
    const lista = ultimaLista === -1 ? "" : campo.caminho.slice(0, ultimaLista);
    return itensDasListas(venda, campo.caminho, indices).flatMap((todos) => {
      const valor = valorDoCampo(venda, campo.caminho, todos);
      if (!preenchido(valor, campo.caminho)) return [];
      const moeda = campo.aparece === "moeda" ? moedaDoCampo(campo, venda, calculos, todos) : null;
      if (moeda !== null && !moeda.mostrar) return [];
      const sigla = moeda !== null && levaSigla(campo) ? moeda.sigla : null;
      const extras = todos.slice(indices.length);
      return [
        {
          rotulo: campo.rotulo,
          valor: formatarCampo(campo, valor, sigla),
          bloco: extras.length === 0 ? "" : `${lista}:${extras.join(",")}`,
        },
      ];
    });
  });
}

/** Os pares na ordem do Anexo B, em blocos: um por item das listas, na ordem em que aparecem. */
function emBlocos(pares: Par[]): Par[][] {
  const blocos = new Map<string, Par[]>();
  for (const par of pares) blocos.set(par.bloco, [...(blocos.get(par.bloco) ?? []), par]);
  return [...blocos.values()];
}

function Pares({ blocos }: Readonly<{ blocos: Par[][] }>) {
  return (
    <div className="space-y-3">
      {blocos.map((pares, i) => (
        <dl
          // biome-ignore lint/suspicious/noArrayIndexKey: os blocos não mudam de ordem
          key={i}
          className={cn(
            "grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-6 gap-y-3",
            i > 0 && "border-t border-borda pt-3",
          )}
        >
          {pares.map((par, k) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: o rótulo se repete entre itens
            <div key={k} className="min-w-0">
              <dt className="text-xs font-semibold tracking-[0.02em] text-texto-auxiliar">
                {par.rotulo}
              </dt>
              <dd className="mt-0.5 text-sm leading-5 break-words tabular-nums">{par.valor}</dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}

/**
 * Os campos do Anexo B que a tela mostra pelo grupo: rótulo e valor dos preenchidos, na ordem do
 * Anexo B. `indices` fixa os itens das listas do caminho (o serviço `k`, o lançamento `k`); uma
 * lista que ele não cobre vira um bloco por item. Sem campo preenchido, não desenha nada.
 */
export function GrupoDeCampos({
  titulo,
  campos,
  venda,
  calculos,
  indices = [],
  recolhido = false,
  nivel,
  secao,
  className,
}: Readonly<{
  titulo: string;
  campos: CampoAnexo[];
  venda: VendaAgi;
  /** Só para a moeda original dos campos do serviço (a conversão vem dos cálculos). */
  calculos?: CalculosVenda;
  indices?: number[];
  recolhido?: boolean;
  nivel: NivelDeTitulo;
  /** `data-anexo-secao` da raiz do grupo (Global Constraints, "Marca para o teste"). */
  secao?: number;
  className?: string;
}>) {
  const pares = paresDoGrupo(campos, venda, calculos, indices);
  if (pares.length === 0) return null;
  const blocos = <Pares blocos={emBlocos(pares)} />;

  if (recolhido) {
    return (
      <details className={cn("group", className)} data-anexo-secao={secao}>
        <summary className="flex min-h-alvo cursor-pointer items-center gap-2 text-sm font-semibold">
          <ChevronRight
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          {titulo}
        </summary>
        <div className="pt-2 pb-3 pl-6">{blocos}</div>
      </details>
    );
  }

  const Titulo = `h${nivel}` as const;
  return (
    <section className={className} data-anexo-secao={secao}>
      <Titulo className="mb-3 text-base leading-6 font-semibold">{titulo}</Titulo>
      {blocos}
    </section>
  );
}
