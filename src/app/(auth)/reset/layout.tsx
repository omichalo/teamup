import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/page-metadata";

export const metadata = pageMetadata("Mot de passe oublié");

export default function PageTitleLayout({ children }: { children: ReactNode }) {
  return children;
}
