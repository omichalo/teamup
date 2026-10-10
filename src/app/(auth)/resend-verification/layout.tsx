import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Renvoyer la vérification");

export default function PageTitleLayout({ children }: { children: ReactNode }) {
  return children;
}
