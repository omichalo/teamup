"use client";

import {
  TabPanel as UiTabPanel,
  type TabPanelProps as UiTabPanelProps,
} from "@/components/ui/TabPanel";

export type TabPanelProps = Omit<UiTabPanelProps, "baseId" | "contentSx"> &
  Partial<Pick<UiTabPanelProps, "baseId" | "contentSx">>;

/** Tab panels compositions : ids par défaut `compositions-tab-*`, padding panneau `p: 5`. */
export function TabPanel({
  baseId = "compositions",
  contentSx = { p: 5 },
  ...rest
}: TabPanelProps) {
  return (
    <UiTabPanel baseId={baseId} contentSx={contentSx} {...rest} />
  );
}
