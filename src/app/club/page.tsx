import { redirect } from "next/navigation";

/** Évite une 404 si seul le préfixe /club est ouvert. */
export default function ClubIndexPage() {
  redirect("/club/inscription");
}
