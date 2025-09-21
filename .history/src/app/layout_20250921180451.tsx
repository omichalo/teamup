import type { Metadata } from "next";
import { ClientThemeProvider } from "@/components/ClientThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQY Ping - Team Up",
  description: "Application de gestion des équipes pour le club SQY Ping",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <ClientThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
