import { TEXTOS_ERRO, textosDoErro, tipoComTexto } from "@/lib/api/textos-erro";

test.each([
  ["sem_resposta", "sem_resposta"],
  ["acesso_recusado", "acesso_recusado"],
  ["formato", "formato"],
  ["aplicacao", "aplicacao"],
  ["cancelada", "aplicacao"],
  ["invalida", "aplicacao"],
  ["nao_encontrada", "aplicacao"],
] as const)("o tipo %s tem os textos de %s", (tipo, comTexto) => {
  expect(tipoComTexto(tipo)).toBe(comTexto);
  expect(textosDoErro(tipo)).toBe(TEXTOS_ERRO[comTexto]);
});
