import { expect, simularApi, test } from "./apoio";

test("tema escolhido vale antes da hidratação", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("stur-web:tema", "escuro");
    document.addEventListener("DOMContentLoaded", () => {
      // biome-ignore lint/suspicious/noExplicitAny: marca lida só por este teste
      (window as any).__temaNoCarregamento = document.documentElement.dataset.theme ?? null;
    });
  });
  await page.goto("/");
  // biome-ignore lint/suspicious/noExplicitAny: marca escrita pelo script de inicialização acima
  expect(await page.evaluate(() => (window as any).__temaNoCarregamento)).toBe("dark");
});

test("igual ao computador segue o sistema", async ({ browser, baseURL }) => {
  const contexto = await browser.newContext({ baseURL, colorScheme: "dark" });
  try {
    const page = await contexto.newPage();
    await simularApi(page);
    await page.goto("/");
    await expect(page.locator('img[src*="a3-logo-negativa"]')).toBeVisible();
    await expect(page.locator('img[src*="a3-logo-recortada"]')).toBeHidden();
  } finally {
    await contexto.close();
  }
});
