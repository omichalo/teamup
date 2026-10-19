declare module "swagger-ui-dist/swagger-ui-bundle.js" {
  type SwaggerUiBundle = (options: {
    url: string;
    domNode: HTMLElement;
    docExpansion?: "none" | "list" | "full";
    deepLinking?: boolean;
  }) => unknown;

  const SwaggerUIBundle: SwaggerUiBundle;
  export default SwaggerUIBundle;
}

declare module "swagger-ui-dist/swagger-ui.css";
