import type { Metadata } from "next";
import { ClientThemeProvider } from "@/components/ClientThemeProvider";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";
import "./globals.css";
import "@fontsource-variable/figtree";

export const metadata: Metadata = {
  title: "SQY Ping - Team Up",
  description: "Application de gestion des équipes pour le club SQY Ping",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
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
