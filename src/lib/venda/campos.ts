/**
 * O que conta como valor na venda, a leitura de um campo pelo caminho do Anexo B e os pares de
 * "Mais detalhes da venda" e de "Códigos do Stur", com os rótulos e as junções do canvas.
 */

import type { VendaAgi } from "@/contrato/tipos";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { formatarDataHora } from "@/lib/formatacao";
import { normalizar } from "@/lib/textos";

const DATA_VAZIA_DO_STUR = "1899-12-30";
const CAMPOS_DE_HORA = new Set(["detalheItem[].horaRetirada", "detalheItem[].horaDevolucao"]);
const MEIA_NOITE = /^1899-12-30(?:[T ]00:00(?::00(?:\.0+)?)?)?$/;

/**
 * Tudo que não é `null`, `""`, `[]` ou `{}`; zero e `false` contam (RF-04). Exceções do Stur:
 * `1899-12-30` é a data vazia (com qualquer hora num campo de data; só à meia-noite num campo de
 * hora da locação ou sem caminho), e `idreservavinculadafee` igual a 0 quer dizer "sem vínculo".
 */
export function preenchido(valor: unknown, caminho?: string): boolean {
  if (valor === null || valor === undefined || valor === "") return false;
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === "object") return Object.keys(valor).length > 0;
  if (typeof valor === "string" && valor.startsWith(DATA_VAZIA_DO_STUR)) {
    const comoHora = caminho === undefined || CAMPOS_DE_HORA.has(caminho);
    return comoHora && !MEIA_NOITE.test(valor);
  }
  if (caminho === "idreservavinculadafee" && valor === 0) return false;
  return true;
}

/**
 * O valor no caminho do Anexo B; cada `[]` lê o índice seguinte de `indices`
 * (`detalheItem[].apartamentos[].qtde` com `[0, 1]` é o 2º apartamento do 1º serviço). Sem índice
 * para uma lista, ou fora dela, dá `undefined`; o caminho que termina na lista dá a lista.
 */
export function valorDoCampo(venda: VendaAgi, caminho: string, indices: number[] = []): unknown {
  let atual: unknown = venda;
  let proximo = 0;
  for (const parte of caminho.split(".")) {
    const lista = parte.endsWith("[]");
    const nome = lista ? parte.slice(0, -2) : parte;
    if (atual === null || typeof atual !== "object") return undefined;
    atual = (atual as Record<string, unknown>)[nome];
    if (lista) {
      const indice = indices[proximo++];
      if (!Array.isArray(atual) || indice === undefined) return undefined;
      atual = atual[indice];
    }
  }
  return atual;
}

/** Fornecedor 2 diferente do 1 (a companhia, o hotel) vem primeiro, com a operadora. */
export function fornecedoresDe(
  fornecedor: string | null,
  fornecedor2: string | null,
): { principal: string | null; operadora: string | null } {
  if (fornecedor2 !== null && fornecedor2 !== fornecedor) {
    return { principal: fornecedor2, operadora: fornecedor };
  }
  return { principal: fornecedor, operadora: null };
}

export type Par = {
  rotulo: (v: VendaAgi) => string;
  /** `null` faz o par sumir. */
  valor: (v: VendaAgi) => string | null;
  campos: string[];
};

function texto(valor: unknown): string | null {
  if (!preenchido(valor)) return null;
  return typeof valor === "string" || typeof valor === "number" ? String(valor) : null;
}

function iguais(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && normalizar(a) === normalizar(b);
}

function juntar(...partes: (string | null)[]): string | null {
  const presentes = partes.filter((p) => p !== null);
  return presentes.length === 0 ? null : presentes.join(" · ");
}

function dataHora(valor: string | null | undefined): string | null {
  return preenchido(valor, "dtcriacao") && valor ? formatarDataHora(valor) : null;
}

function criadaIgualConfirmada(v: VendaAgi): boolean {
  const criada = dataHora(v.dtcriacao);
  return criada !== null && criada === dataHora(v.dtconfirmacao);
}

function emissorIgualCoordenador(v: VendaAgi): boolean {
  return iguais(texto(v.nomeEmissor), texto(v.nomeCoordenador));
}

const ROTULO_DO_FORNECEDOR_2: Record<string, string> = {
  hotelaria: "Hotel",
  aereo: "Companhia",
  rodoviario: "Empresa de ônibus",
  locacao: "Locadora",
};

function fornecedoresDaVenda(v: VendaAgi) {
  return fornecedoresDe(texto(v.nomefornec), texto(v.nomefornec2));
}

function rotuloDoFornecedor(v: VendaAgi): string {
  const classificacao = classificacaoDe(v.classificacaoproduto ?? null) ?? "";
  const rotulo2 = ROTULO_DO_FORNECEDOR_2[classificacao];
  if (fornecedoresDaVenda(v).operadora !== null) return rotulo2 ?? "Fornecedor 2";
  if (texto(v.nomefornec2) === null || rotulo2 === undefined) return "Fornecedor";
  return classificacao === "aereo" ? "Fornecedor e companhia" : rotulo2;
}

function integracao(v: VendaAgi): string {
  const sistema = texto(v.sistemaExterno?.sistema);
  const id = texto(v.sistemaExterno?.idVenda);
  if (sistema === null && id === null) return "nenhuma: lançada direto no Stur";
  if (id === null) return sistema ?? "";
  return sistema === null ? `ID Venda: ${id}` : `${sistema}, ID Venda: ${id}`;
}

/** Os grupos de "Mais detalhes da venda" (Anexo B, seção 8) que o canvas desenha. */
export const GRUPOS_MAIS_DETALHES: { grupo: string; pares: Par[] }[] = [
  {
    grupo: "Quem comprou",
    pares: [
      {
        rotulo: (v) => (texto(v.grupocliente) === null ? "Cliente" : "Cliente e grupo"),
        valor: (v) => juntar(texto(v.nomecliente), texto(v.grupocliente)),
        campos: ["nomecliente", "grupocliente"],
      },
      {
        rotulo: (v) => {
          const solicitante = texto(v.nomeSolicitante);
          const autorizador = texto(v.nomeAutorizador);
          if (solicitante !== null && autorizador !== null) return "Solicitante e autorizador";
          return solicitante === null && autorizador !== null ? "Autorizador" : "Solicitante";
        },
        valor: (v) => {
          const solicitante = texto(v.nomeSolicitante);
          const proprio = iguais(solicitante, texto(v.nomecliente)) ? "o próprio cliente" : null;
          return juntar(proprio ?? solicitante, texto(v.nomeAutorizador));
        },
        campos: ["nomeSolicitante", "nomeAutorizador"],
      },
    ],
  },
  {
    grupo: "Quem vendeu na A3",
    pares: [
      {
        rotulo: (v) => (emissorIgualCoordenador(v) ? "Emissor e coordenador" : "Emissor"),
        valor: (v) => texto(v.nomeEmissor),
        campos: ["nomeEmissor"],
      },
      {
        rotulo: () => "Coordenador",
        valor: (v) => (emissorIgualCoordenador(v) ? null : texto(v.nomeCoordenador)),
        campos: ["nomeCoordenador"],
      },
      { rotulo: () => "Promotor", valor: (v) => texto(v.nomePromotor), campos: ["nomePromotor"] },
      {
        rotulo: (v) => {
          if (texto(v.nomeCenctroCustos) === null) return "Filial";
          return texto(v.nomeFilial) === null
            ? "Centro de custo da filial"
            : "Filial e centro de custo";
        },
        valor: (v) => juntar(texto(v.nomeFilial), texto(v.nomeCenctroCustos)),
        campos: ["nomeFilial", "nomeCenctroCustos"],
      },
    ],
  },
  {
    grupo: "Fornecedores",
    pares: [
      {
        rotulo: () => "Operadora",
        valor: (v) => fornecedoresDaVenda(v).operadora,
        campos: ["nomefornec"],
      },
      {
        rotulo: rotuloDoFornecedor,
        valor: (v) => fornecedoresDaVenda(v).principal,
        campos: ["nomefornec", "nomefornec2"],
      },
    ],
  },
  {
    grupo: "Origem da venda",
    pares: [
      {
        rotulo: () => "Integração",
        // Exceção registrada: o único valor mostrado para um campo vazio, como no canvas.
        valor: integracao,
        campos: ["sistemaExterno.sistema", "sistemaExterno.idVenda"],
      },
    ],
  },
  {
    grupo: "Datas da venda",
    pares: [
      {
        rotulo: (v) => (criadaIgualConfirmada(v) ? "Criada e confirmada" : "Criada no Stur"),
        valor: (v) => dataHora(v.dtcriacao),
        campos: ["dtcriacao"],
      },
      {
        rotulo: () => "Confirmada",
        valor: (v) => (criadaIgualConfirmada(v) ? null : dataHora(v.dtconfirmacao)),
        campos: ["dtconfirmacao"],
      },
      {
        rotulo: () => "Última alteração",
        valor: (v) => dataHora(v.dtalteracao),
        campos: ["dtalteracao"],
      },
    ],
  },
];

function idsDosFornecedores(v: VendaAgi): string | null {
  const um = texto(v.idfornec);
  const dois = texto(v.idfornec2);
  if (dois === null || dois === um) return um;
  return um === null ? dois : `${um} e ${dois}`;
}

function doisFornecedores(v: VendaAgi): boolean {
  const um = texto(v.idfornec);
  const dois = texto(v.idfornec2);
  return um !== null && dois !== null && um !== dois;
}

/** Os códigos internos que o canvas desenha (Anexo B, seção 9). */
export const CODIGOS_DO_STUR: { grupo: string; pares: Par[] }[] = [
  {
    grupo: "Códigos internos, para diagnóstico",
    pares: [
      {
        rotulo: () => "Id interno da venda",
        valor: (v) => texto(v.idreserva),
        campos: ["idreserva"],
      },
      {
        rotulo: (v) =>
          doisFornecedores(v) ? "Cliente, produto e fornecedores" : "Cliente, produto e fornecedor",
        valor: (v) => juntar(texto(v.idCliente), texto(v.idproduto), idsDosFornecedores(v)),
        campos: ["idCliente", "idproduto", "idfornec", "idfornec2"],
      },
      {
        rotulo: () => "Arquivo de importação",
        valor: (v) => texto(v.nomearquivo),
        campos: ["nomearquivo"],
      },
    ],
  },
];
