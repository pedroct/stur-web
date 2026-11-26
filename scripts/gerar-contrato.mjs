// Baixa o openapi.json da tag de stur-api fixada em contrato.json e gera os tipos TypeScript.
// CONTRATO_OPENAPI=<arquivo> lê um arquivo local no lugar da tag (para trabalhar com o backend local).

import { execFileSync } from "node:child_process";
import fs from "node:fs";

const { sturApi: tag } = JSON.parse(fs.readFileSync("contrato.json", "utf8"));

let texto;
if (process.env.CONTRATO_OPENAPI) {
  texto = fs.readFileSync(process.env.CONTRATO_OPENAPI, "utf8");
} else {
  const url = `https://raw.githubusercontent.com/pedroct/stur-api/${tag}/openapi.json`;
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Não consegui baixar ${url}: HTTP ${resposta.status}`);
  }
  texto = await resposta.text();
}

fs.mkdirSync("src/contrato", { recursive: true });
fs.writeFileSync("src/contrato/openapi.json", `${JSON.stringify(JSON.parse(texto), null, 2)}\n`);
execFileSync(
  "pnpm",
  ["exec", "openapi-typescript", "src/contrato/openapi.json", "-o", "src/contrato/schema.d.ts"],
  { stdio: "inherit" },
);
