"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

type SwaggerUiBundle = (options: {
  url: string;
  domNode: HTMLElement;
  docExpansion?: "none" | "list" | "full";
  deepLinking?: boolean;
}) => unknown;

/**
 * Host Swagger UI via swagger-ui-dist (évite la chaîne remarkable/sprintf de swagger-ui-react).
 */
export function SwaggerUiHost({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void import("swagger-ui-dist/swagger-ui-bundle.js").then((mod) => {
      if (cancelled || !containerRef.current) return;
      const SwaggerUIBundle = (mod as { default?: SwaggerUiBundle }).default ??
        (mod as unknown as SwaggerUiBundle);
      el.innerHTML = "";
      SwaggerUIBundle({
        url,
        domNode: el,
        docExpansion: "none",
        deepLinking: true,
      });
    });

    return () => {
      cancelled = true;
      el.innerHTML = "";
    };
  }, [url]);

  return <div ref={containerRef} />;
}
