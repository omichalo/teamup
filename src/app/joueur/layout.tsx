import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Accueil");

export default function PageTitleLayout({ children }: { children: ReactNode }) {
  return children;
}
