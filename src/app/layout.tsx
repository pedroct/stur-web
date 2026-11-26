import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { SCRIPT_TEMA } from "@/lib/tema";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Consulta de reserva",
  icons: { icon: "/marca/favicon-a3.png" },
  openGraph: { locale: "pt_BR" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={rubik.variable}>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script fixo do tema, sem entrada do usuário */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
