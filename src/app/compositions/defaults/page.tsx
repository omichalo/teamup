"use client";

import { DefaultCompositionsContainer } from "../_containers/DefaultCompositionsContainer";

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";

export default function DefaultCompositionsPage() {
  return <DefaultCompositionsContainer />;
}
