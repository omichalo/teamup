import type { Metadata } from "next";
import { ClientThemeProvider } from "@/components/ClientThemeProvider";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";
import "./globals.css";
import "@fontsource-variable/figtree";

export const metadata: Metadata = {
  title: "SQY Ping - Team Up",
  description: "Application de gestion des équipes pour le club SQY Ping",
  // Les fichiers icon.png, icon.svg, apple-icon.png et apple-icon.svg dans app/ 
  // sont automatiquement détectés et servis par Next.js App Router
};

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <ClientThemeProvider>
          <AppLayoutWrapper>{children}</AppLayoutWrapper>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
