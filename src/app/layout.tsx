import type { Metadata } from "next";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ClientThemeProvider } from "@/components/ClientThemeProvider";
import { AppLayoutWrapper } from "@/components/AppLayoutWrapper";
import { FirebaseAuthRestorer } from "@/components/FirebaseAuthRestorer";
import "./globals.css";
import "@fontsource-variable/figtree";

export const metadata: Metadata = {
  title: {
    default: "SQY Ping - Team Up",
    template: "%s — Team Up",
  },
  description: "Espace club SQY Ping — adhésions, équipes et vie sportive",
  // Les fichiers icon.png, icon.svg, apple-icon.png et apple-icon.svg dans app/ 
  // sont automatiquement détectés et servis par Next.js App Router
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <FirebaseAuthRestorer />
        <ClientThemeProvider>
          <AppLayoutWrapper>{children}</AppLayoutWrapper>
          <AnalyticsProvider />
        </ClientThemeProvider>
      </body>
    </html>
  );
}
