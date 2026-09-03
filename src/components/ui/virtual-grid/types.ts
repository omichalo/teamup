import type { CSSProperties, ReactNode, RefObject } from "react";

export type VirtualGridColumn<T> = {
  id: string;
  width: number;
  /** Contenu en-tête (tri, resize, etc. fournis par le domaine). */
  renderHeader: () => ReactNode;
  /** Ligne de filtres optionnelle sous l’en-tête. */
  renderFilter?: () => ReactNode;
  renderCell: (row: T, rowIndex: number) => ReactNode;
  /** Texte tooltip au survol cellule (optionnel). */
  getTooltip?: (row: T, rowIndex: number) => string;
};

export type VirtualGridProps<T> = {
  rows: T[];
  columns: VirtualGridColumn<T>[];
  getRowId: (row: T) => string;
  rowHeight: number;
  headerHeight: number;
  /** Hauteur de la rangée filtres ; 0 si absente. */
  filterRowHeight?: number;
  /** Nombre de colonnes épinglées à gauche (toujours montées). */
  pinnedColumnCount?: number;
  overscanRows?: number;
  overscanColumns?: number;
  onRowClick?: (row: T, rowIndex: number) => void;
  onRowMouseEnter?: (row: T, rowIndex: number, anchor: HTMLElement) => void;
  onRowMouseLeave?: () => void;
  /** Classe / style de ligne (sélection, bordure statut…). */
  getRowStyle?: (row: T, rowIndex: number) => CSSProperties | undefined;
  getRowClassName?: (row: T, rowIndex: number) => string | undefined;
  emptyContent?: ReactNode;
  fillAvailableHeight?: boolean;
  maxHeight?: CSSProperties["maxHeight"];
  className?: string;
  style?: CSSProperties;
  /** Active le Popper tooltip partagé (nécessite getTooltip sur les colonnes). */
  enableSharedTooltip?: boolean;
  /** Ref optionnelle vers le conteneur scroll (tests / sync). */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
};
