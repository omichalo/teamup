"use client";

import { Button } from "@mui/material";
import { Add, PlaceOutlined } from "@mui/icons-material";
import type { RegistrationConfigV1, RegistrationSite } from "@/lib/club-registration-config/types";
import { getSortedSiteSlots } from "@/lib/club-registration-config/normalize-sort-orders";
import {
  moveBySortOrder,
  nextSortOrder,
  reindexSortOrder,
  sortBySortOrder,
} from "@/lib/club-registration-config/sort-order";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorEmptyState,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";
import { createEmptySlot, moveSiteSlots, SiteLocationEditorCard } from "./SiteLocationEditorCard";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function newSite(sortOrder: number): RegistrationSite {
  return {
    id: generateConfigItemId("site"),
    label: "Nouveau lieu",
    gymnasiumName: undefined,
    linkedSectionIds: [],
    sortOrder,
    slots: [],
  };
}

export function SitesSlotsEditor({ config, onChange }: Props) {
  const sectionOptions = config.sections.map((section) => ({
    value: section.id,
    label: section.label,
  }));
  const sortedSites = sortBySortOrder(config.sites);
  const expansion = useConfigEditorExpansion();

  const addSite = (sortOrder: number) => {
    const site = newSite(sortOrder);
    onChange({
      ...config,
      sites: [...config.sites, site],
    });
    expansion.expandItem(site.id);
  };

  const updateSiteById = (siteId: string, patch: Partial<RegistrationSite>) => {
    onChange({
      ...config,
      sites: config.sites.map((site) => (site.id === siteId ? { ...site, ...patch } : site)),
    });
  };

  const updateSlotById = (
    siteId: string,
    slotId: string,
    patch: Partial<RegistrationSite["slots"][number]>
  ) => {
    onChange({
      ...config,
      sites: config.sites.map((site) => {
        if (site.id !== siteId) return site;
        return {
          ...site,
          slots: site.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
        };
      }),
    });
  };

  const setSchoolPickup = (
    siteId: string,
    slotId: string,
    enabled: boolean,
    schoolName?: string
  ) => {
    onChange({
      ...config,
      sites: config.sites.map((site) => {
        if (site.id !== siteId) return site;
        return {
          ...site,
          slots: site.slots.map((slot) => {
            if (slot.id !== slotId) return slot;
            const next = { ...slot };
            if (!enabled) {
              delete next.schoolPickupSchool;
            } else {
              next.schoolPickupSchool = schoolName?.trim() || "École";
            }
            return next;
          }),
        };
      }),
    });
  };

  const moveSite = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      sites: moveBySortOrder(config.sites, fromIndex, toIndex),
    });
  };

  const moveSlot = (siteId: string, fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      sites: config.sites.map((site) => {
        if (site.id !== siteId) return site;
        const sortedSlots = getSortedSiteSlots(site.slots);
        return {
          ...site,
          slots: moveSiteSlots(sortedSlots, fromIndex, toIndex),
        };
      }),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Organisez la configuration en deux niveaux : un <strong>lieu</strong> (salle, gymnase…) puis
        les <strong>créneaux horaires</strong> proposés à cet endroit.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Glissez-déposez pour réordonner lieux et créneaux. Désactivez plutôt que supprimer pour
        préserver les dossiers existants.
      </ConfigEditorHint>

      {sortedSites.length === 0 ? (
        <ConfigEditorEmptyState
          icon={<PlaceOutlined sx={{ fontSize: 40 }} />}
          title="Aucun lieu configuré"
          description="Commencez par ajouter un lieu d'entraînement, puis ses créneaux horaires."
          action={
            <Button variant="contained" startIcon={<Add />} onClick={() => addSite(0)}>
              Ajouter un lieu
            </Button>
          }
        />
      ) : (
        <>
          <ConfigEditorSortableList droppableId="sites" onMove={moveSite}>
            {sortedSites.map((site, siteIndex) => {
              const sortedSlots = getSortedSiteSlots(site.slots);
              return (
                <ConfigEditorDraggableItem key={site.id} draggableId={site.id} index={siteIndex}>
                  {({ dragHandleProps, isDragging }) => (
                    <SiteLocationEditorCard
                      site={{ ...site, slots: sortedSlots }}
                      sectionOptions={sectionOptions}
                      expanded={expansion.isExpanded(site.id)}
                      onExpandedChange={(open) => expansion.setExpanded(site.id, open)}
                      slotExpansion={expansion}
                      dragHandleProps={dragHandleProps}
                      isDragging={isDragging}
                      onUpdateSite={(patch) => updateSiteById(site.id, patch)}
                      onRemoveSite={() =>
                        onChange({
                          ...config,
                          sites: reindexSortOrder(config.sites.filter((item) => item.id !== site.id)),
                        })
                      }
                      onUpdateSlot={(slotId, patch) => updateSlotById(site.id, slotId, patch)}
                      onRemoveSlot={(slotId) => {
                        const remaining = site.slots.filter((slot) => slot.id !== slotId);
                        updateSiteById(site.id, { slots: reindexSortOrder(remaining) });
                      }}
                      onSchoolPickupChange={(slotId, enabled, schoolName) =>
                        setSchoolPickup(site.id, slotId, enabled, schoolName)
                      }
                      onMoveSlot={(from, to) => moveSlot(site.id, from, to)}
                      onAddSlot={() => {
                        const nextSlot = createEmptySlot(site.slots);
                        updateSiteById(site.id, { slots: [...site.slots, nextSlot] });
                        expansion.setExpanded(site.id, true);
                        expansion.expandItem(nextSlot.id);
                      }}
                    />
                  )}
                </ConfigEditorDraggableItem>
              );
            })}
          </ConfigEditorSortableList>
          <ConfigEditorAddButton
            label="Ajouter un lieu"
            onClick={() => addSite(nextSortOrder(config.sites))}
          />
        </>
      )}
    </ConfigEditorRoot>
  );
}
