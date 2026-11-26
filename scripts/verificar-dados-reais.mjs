// Gancho do pre-commit e passo do CI: recusa dados reais em arquivos versionados (repo público).
//
// Falha fechada: o caminho de todo arquivo é verificado; o conteúdo é lido em bytes e decodificado
// com troca (latin-1/cp1252 não escapam); erro de leitura vira problema. Só o conteúdo de arquivo
// com byte NUL (binário) não é varrido, para não gerar falso positivo; o caminho dele é.
// Porte de consulta-reserva/stur-api/scripts/verificar_dados_reais.py: mesmos padrões e mensagens.

import fs from "node:fs";
import { pathToFileURL } from "node:url";

// O padrão do identificador da A3 é montado por concatenação para o script não casar consigo mesmo.
// O número de reserva só casa quando não faz parte de um número maior (`(?<!\d)`/`(?!\d)`):
// `\b` não separa dígito de `_`/letra e deixaria passar `RE_<n>`, `<n>_tela`, `v<n>.png`.
// O `\d` do JavaScript casa só algarismos ASCII (o do Python, qualquer algarismo Unicode):
// diferença aceita, porque os números reais são ASCII.
const PADROES = [
  [/(?<!\d)15[5-6]\d{5}(?!\d)/, "número de reserva real"],
  [new RegExp("a3" + "turismo", "i"), "identificador da A3"],
];

// Mesmos separadores do `str.splitlines()` do Python.
// biome-ignore lint/suspicious/noControlCharactersInRegex: os caracteres de controle são o ponto
const SEPARADOR_DE_LINHA = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/;

// Nome que o Python dá ao erro de leitura.
const NOME_DO_ERRO = {
  ENOENT: "FileNotFoundError",
  EACCES: "PermissionError",
  EPERM: "PermissionError",
  EISDIR: "IsADirectoryError",
  ENOTDIR: "NotADirectoryError",
};

const decodificador = new TextDecoder("utf-8", { fatal: false });

/** @param {string} texto */
function linhas(texto) {
  const partes = texto.split(SEPARADOR_DE_LINHA);
  if (partes[partes.length - 1] === "") partes.pop();
  return partes;
}

/**
 * Devolve uma mensagem por ocorrência de dado real: `arquivo:linha: motivo` no conteúdo,
 * `arquivo: motivo (no caminho)` no caminho, `arquivo: arquivo não pôde ser lido (Erro)`.
 * @param {string[]} arquivos
 * @returns {string[]}
 */
export function verificar(arquivos) {
  const problemas = [];
  for (const arquivo of arquivos) {
    for (const [padrao, motivo] of PADROES) {
      if (padrao.test(arquivo)) problemas.push(`${arquivo}: ${motivo} (no caminho)`);
    }
    let conteudo;
    try {
      conteudo = fs.readFileSync(arquivo);
    } catch (erro) {
      const nome =
        NOME_DO_ERRO[/** @type {NodeJS.ErrnoException} */ (erro).code ?? ""] ?? "OSError";
      problemas.push(`${arquivo}: arquivo não pôde ser lido (${nome})`);
      continue;
    }
    if (conteudo.includes(0)) continue;
    linhas(decodificador.decode(conteudo)).forEach((linha, indice) => {
      for (const [padrao, motivo] of PADROES) {
        if (padrao.test(linha)) problemas.push(`${arquivo}:${indice + 1}: ${motivo}`);
      }
    });
  }
  return problemas;
}

/**
 * @param {string[]} [argumentos] caminhos; sem o argumento, lê `process.argv`
 * @returns {number} código de saída
 */
export function main(argumentos) {
  const problemas = verificar(argumentos ?? process.argv.slice(2));
  for (const problema of problemas) console.error(problema);
  return problemas.length > 0 ? 1 : 0;
}

// O Node resolve `import.meta.url` pelo caminho real; `process.argv[1]` não passa por esse passo.
// Sem o `realpathSync`, a chamada por um caminho com symlink não rodaria o `main` e sairia com 0.
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exit(main());
}
