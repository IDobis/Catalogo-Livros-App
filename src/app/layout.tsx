import type { Metadata } from "next";
import Providers from "@/providers/Providers";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
