import type { Metadata } from "next";
import ThemeRegistry from "@/providers/ThemeRegistry";
import AppSettingsProvider from "@/providers/AppSettings";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de Coleções",
  description: "Controle pessoal de coleções",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeRegistry>
          <AppSettingsProvider>{children}</AppSettingsProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
