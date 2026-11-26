import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;
const EMPRESA = !!process.env.CI;

// Os fluxos rodam contra a build de produção (o mesmo `standalone` da imagem), com a API simulada
// no navegador por `page.route` (e2e/apoio.ts): nenhum backend é necessário.
export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: EMPRESA,
  retries: EMPRESA ? 1 : 0,
  reporter: EMPRESA ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Fortaleza",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && PORT=${PORTA} pnpm start`,
    url: `http://localhost:${PORTA}`,
    timeout: 300_000,
    reuseExistingServer: false,
    stdout: "ignore",
  },
});
