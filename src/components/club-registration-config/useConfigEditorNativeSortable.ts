"use client";

import { useCallback, useRef, useState } from "react";

export type ConfigEditorNativeDragHandleProps = {
  draggable: true;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: (event: React.MouseEvent) => void;
};

export function useConfigEditorNativeSortable(onMove: (fromIndex: number, toIndex: number) => void) {
  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const getDropTargetProps = useCallback(
    (index: number) => ({
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const fromIndex = dragIndexRef.current;
        if (fromIndex !== null && fromIndex !== index) {
          onMove(fromIndex, index);
        }
        dragIndexRef.current = null;
        setDraggingIndex(null);
      },
    }),
    [onMove]
  );

  const getDragHandleProps = useCallback(
    (index: number): ConfigEditorNativeDragHandleProps => ({
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.stopPropagation();
        dragIndexRef.current = index;
        setDraggingIndex(index);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      },
      onDragEnd: () => {
        dragIndexRef.current = null;
        setDraggingIndex(null);
      },
      onClick: (event: React.MouseEvent) => event.stopPropagation(),
    }),
    []
  );

  return {
    draggingIndex,
    getDropTargetProps,
    getDragHandleProps,
    isDragging: (index: number) => draggingIndex === index,
  };
}
