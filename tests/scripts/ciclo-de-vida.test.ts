import fs from "node:fs";

const { scripts } = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

it.each([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
])("o script %s não baixa código fora do lockfile", (nome) => {
  expect(scripts[nome] ?? "").not.toMatch(/\b(npx|dlx|curl|wget)\b/);
});
