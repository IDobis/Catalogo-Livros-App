import type { Metadata } from "next";
import ThemeRegistry from "@/providers/ThemeRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de Livros",
  description: "Controle pessoal de biblioteca",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
