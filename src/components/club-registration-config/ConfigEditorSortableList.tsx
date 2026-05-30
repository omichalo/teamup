"use client";

import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DropResult,
} from "react-beautiful-dnd";
import { configEditorSortableListSx } from "./config-editor-layout";

type SortableListProps = {
  droppableId: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
  spacing?: number;
};

export function ConfigEditorSortableList({
  droppableId,
  onMove,
  children,
  spacing = 1.25,
}: SortableListProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from !== to) onMove(from, to);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable
        droppableId={droppableId}
        isDropDisabled={false}
        isCombineEnabled={false}
        ignoreContainerClipping={false}
      >
        {(provided) => (
          <Stack
            ref={provided.innerRef}
            {...provided.droppableProps}
            spacing={spacing}
            sx={configEditorSortableListSx}
          >
            {children}
            {provided.placeholder}
          </Stack>
        )}
      </Droppable>
    </DragDropContext>
  );
}

type DraggableItemProps = {
  draggableId: string;
  index: number;
  children: (state: {
    dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
    isDragging: boolean;
  }) => ReactNode;
};

export function ConfigEditorDraggableItem({
  draggableId,
  index,
  children,
}: DraggableItemProps) {
  return (
    <Draggable
      draggableId={draggableId}
      index={index}
      isDragDisabled={false}
      disableInteractiveElementBlocking={false}
    >
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            ...(snapshot.isDragging
              ? {
                  boxShadow: 4,
                  borderRadius: 2,
                  zIndex: 10,
                }
              : {}),
          }}
        >
          {children({
            dragHandleProps: provided.dragHandleProps,
            isDragging: snapshot.isDragging,
          })}
        </Box>
      )}
    </Draggable>
  );
}
