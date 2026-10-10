import { pageMetadata } from "@/lib/seo/page-metadata";
import { HomePageClient } from "./HomePageClient";

export const metadata = pageMetadata("Accueil");

export default function DashboardPage() {
  return <HomePageClient />;
}
