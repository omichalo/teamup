"use client";

import { CompositionsPageContainer } from "./_containers/CompositionsPageContainer";

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";

export default function CompositionsPage() {
  return <CompositionsPageContainer />;
}
