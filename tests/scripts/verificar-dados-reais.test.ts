// Porte, um a um, dos casos de consulta-reserva/stur-api/tests/test_verificar_dados_reais.py.
// Os literais "reais" são montados por concatenação: o próprio gancho recusaria o número real
// escrito inteiro (idem para o identificador da A3).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main, verificar } from "../../scripts/verificar-dados-reais.mjs";

const N = "1567" + "4899";
const N_B = "1557" + "0001";
const IDENTIFICADOR_A3 = "A3" + "TURISMO";

let diretorio: string;

beforeEach(() => {
  diretorio = fs.mkdtempSync(path.join(os.tmpdir(), "verificar-"));
});

afterEach(() => {
  fs.rmSync(diretorio, { recursive: true, force: true });
});

function escrever(nome: string, conteudo: string | Buffer): string {
  const arquivo = path.join(diretorio, nome);
  fs.writeFileSync(arquivo, conteudo);
  return arquivo;
}

test("recusa número de reserva real no conteúdo, nas duas faixas", () => {
  const arquivo = escrever("x.ts", `const n = ${N};\nconst m = ${N_B};\n`);
  expect(verificar([arquivo])).toEqual([
    `${arquivo}:1: número de reserva real`,
    `${arquivo}:2: número de reserva real`,
  ]);
});

test("recusa o número de reserva real em uma só linha de uma faixa", () => {
  const arquivo = escrever("x.ts", `numero = ${N}\n`);
  expect(verificar([arquivo])).toEqual([`${arquivo}:1: número de reserva real`]);
});

test("recusa o identificador da A3 na URL, sem diferença de caixa", () => {
  const arquivo = escrever("x.md", `https://x.invalid/${IDENTIFICADOR_A3}/api\n`);
  expect(verificar([arquivo])).toEqual([`${arquivo}:1: identificador da A3`]);
});

test("aceita número inventado", () => {
  const arquivo = escrever("x.ts", "numero = 90000001\n");
  expect(verificar([arquivo])).toEqual([]);
});

test.each([
  [`RE_${N}`],
  [`${N}_tela`],
  [`v${N}.png`],
  [`id=${N};`],
])("recusa o número colado: %s", (texto) => {
  const arquivo = escrever("c.ts", `${texto}\n`);
  expect(verificar([arquivo])).toEqual([`${arquivo}:1: número de reserva real`]);
});

test.each([
  [`9${N}`],
  [`${N}9`],
  [`9${N}9`],
])("aceita o número dentro de um número maior: %s", (texto) => {
  expect(verificar([escrever("m.ts", `${texto}\n`)])).toEqual([]);
});

test("recusa o identificador da A3 no caminho", () => {
  const arquivo = escrever(`${IDENTIFICADOR_A3.toLowerCase()}.json`, "{}");
  expect(verificar([arquivo])).toEqual([`${arquivo}: identificador da A3 (no caminho)`]);
});

test("recusa o número de reserva real no caminho, com o conteúdo limpo", () => {
  const arquivo = escrever(`v${N}.png`, "conteudo limpo\n");
  expect(verificar([arquivo])).toEqual([`${arquivo}: número de reserva real (no caminho)`]);
});

test("aceita os números de teste", () => {
  expect(verificar([escrever("y.ts", "90000001 RE_9000")])).toEqual([]);
});

test("não varre o conteúdo de binário, mas varre o caminho", () => {
  expect(verificar([escrever("z.png", `\u0000${N}`)])).toEqual([]);
  const binario = escrever(`RE_${N}.png`, "\u0000");
  expect(verificar([binario])).toEqual([`${binario}: número de reserva real (no caminho)`]);
});

test("conteúdo em latin-1 é lido com troca, sem escapar", () => {
  const arquivo = escrever("l.txt", Buffer.from(`caf\xe9 ${N}\n`, "latin1"));
  expect(verificar([arquivo])).toEqual([`${arquivo}:1: número de reserva real`]);
});

test("as linhas são separadas como o splitlines do Python", () => {
  // \v, \f, \x1c, \x1d, \x1e, \x85, U+2028 e U+2029 também quebram linha; \r\n conta uma vez
  const separadores = [
    "\r\n",
    "\r",
    "\v",
    "\f",
    "\x1c",
    "\x1d",
    "\x1e",
    "\x85",
    "\u2028",
    "\u2029",
  ];
  for (const separador of separadores) {
    const arquivo = escrever("s.txt", `ok${separador}${N}`);
    expect(verificar([arquivo])).toEqual([`${arquivo}:2: número de reserva real`]);
  }
});

test("arquivo que não existe vira problema, com o nome do erro do Python", () => {
  expect(verificar(["/nao/existe.ts"])).toEqual([
    "/nao/existe.ts: arquivo não pôde ser lido (FileNotFoundError)",
  ]);
});

test("diretório vira problema, com o nome do erro do Python", () => {
  expect(verificar([diretorio])).toEqual([
    `${diretorio}: arquivo não pôde ser lido (IsADirectoryError)`,
  ]);
});

test("main sai com 1 quando há problema e 0 sem problema ou sem arquivos", () => {
  const erro = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(main([escrever("p.ts", N)])).toBe(1);
  expect(erro).toHaveBeenCalledWith(expect.stringContaining("número de reserva real"));
  expect(main([escrever("q.ts", "ok")])).toBe(0);
  expect(main([])).toBe(0);
  expect(main([path.join(diretorio, "nao_existe.ts")])).toBe(1);
});
