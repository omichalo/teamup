import React from "react";

/**
 * FontProvider - Composant pour charger automatiquement la police Figtree
 *
 * Ce composant charge automatiquement la police Figtree Variable utilisée par le thème SQY PING.
 * Il doit être utilisé au niveau racine de l'application, idéalement dans le AppThemeProvider.
 * 
 * Note: Le CSS de la police doit être importé manuellement dans l'application parente
 * avec: import '@fontsource-variable/figtree/index.css'
 */
export const FontProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

export default FontProvider;