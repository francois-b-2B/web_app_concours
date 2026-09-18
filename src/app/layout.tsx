import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Concours Belote & Boules",
  description: "Gestion de concours de belote et de boules — inscriptions, tirage, scores, classement, tableau final.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
