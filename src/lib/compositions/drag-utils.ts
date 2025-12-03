import type { Player } from "@/types/team-management";
import type { PhaseType } from "@/lib/compositions/validators";
import { ChampionshipType } from "@/types";

interface CreateDragImageOptions {
  championshipType?: ChampionshipType;
  phase?: PhaseType;
}

/**
 * Crée un élément DOM utilisé comme image personnalisée pour le drag & drop
 * afin d'assurer un rendu cohérent entre la liste des joueurs disponibles
 * et les cartes d'équipe.
 */
export const createDragImage = (
  player: Player,
  options: CreateDragImageOptions = {}
): HTMLElement => {
  const { championshipType = "masculin", phase = "aller" } = options;

  const width = 300;
  const minHeight = 60;

  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.top = "-1000px";
  tempDiv.style.left = "-1000px";
  tempDiv.style.width = `${width}px`;
  tempDiv.style.minHeight = `${minHeight}px`;
  tempDiv.style.backgroundColor = "white";
  tempDiv.style.border = "1px solid #ccc";
  tempDiv.style.borderRadius = "4px";
  tempDiv.style.padding = "8px";
  tempDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  tempDiv.style.opacity = "0.9";
  tempDiv.style.pointerEvents = "none";
  tempDiv.style.boxSizing = "border-box";
  tempDiv.style.display = "flex";
  tempDiv.style.alignItems = "center";
  tempDiv.style.flexDirection = "row";

  const clonedContent = document.createElement("div");
  clonedContent.style.width = "100%";
  clonedContent.style.display = "flex";
  clonedContent.style.alignItems = "center";
  clonedContent.style.margin = "0";
  clonedContent.style.padding = "0";

  const iconContainer = document.createElement("div");
  iconContainer.style.marginRight = "8px";
  iconContainer.style.display = "flex";
  iconContainer.style.alignItems = "center";
  iconContainer.style.color = "rgba(0, 0, 0, 0.54)";
  iconContainer.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  `;
  clonedContent.appendChild(iconContainer);

  const textContainer = document.createElement("div");
  textContainer.style.flex = "1 1 auto";
  textContainer.style.minWidth = "0";

  const primaryContainer = document.createElement("div");
  primaryContainer.style.display = "flex";
  primaryContainer.style.alignItems = "center";
  primaryContainer.style.gap = "4px";
  primaryContainer.style.flexWrap = "wrap";
  primaryContainer.style.marginBottom = "4px";

  const nameSpan = document.createElement("span");
  nameSpan.textContent = `${player.firstName} ${player.name}`;
  nameSpan.style.fontSize = "0.875rem";
  nameSpan.style.fontWeight = "500";
  nameSpan.style.lineHeight = "1.43";
  primaryContainer.appendChild(nameSpan);

  const isEuropean = player.nationality === "C";
  const isForeign = player.nationality === "ETR";

  const burnedTeam =
    championshipType === "masculin"
      ? player.highestMasculineTeamNumberByPhase?.[phase]
      : player.highestFeminineTeamNumberByPhase?.[phase];

  if (isEuropean) {
    const euroChip = document.createElement("span");
    euroChip.textContent = "EUR";
    euroChip.style.display = "inline-flex";
    euroChip.style.alignItems = "center";
    euroChip.style.justifyContent = "center";
    euroChip.style.height = "20px";
    euroChip.style.padding = "0 6px";
    euroChip.style.fontSize = "0.7rem";
    euroChip.style.border = "1px solid rgba(25, 118, 210, 0.5)";
    euroChip.style.borderRadius = "16px";
    euroChip.style.color = "rgba(25, 118, 210, 1)";
    euroChip.style.backgroundColor = "transparent";
    primaryContainer.appendChild(euroChip);
  }

  if (isForeign) {
    const etrChip = document.createElement("span");
    etrChip.textContent = "ETR";
    etrChip.style.display = "inline-flex";
    etrChip.style.alignItems = "center";
    etrChip.style.justifyContent = "center";
    etrChip.style.height = "20px";
    etrChip.style.padding = "0 6px";
    etrChip.style.fontSize = "0.7rem";
    etrChip.style.border = "1px solid rgba(237, 108, 2, 0.5)";
    etrChip.style.borderRadius = "16px";
    etrChip.style.color = "rgba(237, 108, 2, 1)";
    etrChip.style.backgroundColor = "transparent";
    primaryContainer.appendChild(etrChip);
  }

  if (burnedTeam !== undefined && burnedTeam !== null) {
    const burnedChip = document.createElement("span");
    burnedChip.textContent = `Brûlé Éq. ${burnedTeam}`;
    burnedChip.style.display = "inline-flex";
    burnedChip.style.alignItems = "center";
    burnedChip.style.justifyContent = "center";
    burnedChip.style.height = "20px";
    burnedChip.style.padding = "0 6px";
    burnedChip.style.fontSize = "0.7rem";
    burnedChip.style.border = "1px solid rgba(211, 47, 47, 0.5)";
    burnedChip.style.borderRadius = "16px";
    burnedChip.style.color = "rgba(211, 47, 47, 1)";
    burnedChip.style.backgroundColor = "transparent";
    primaryContainer.appendChild(burnedChip);
  }

  textContainer.appendChild(primaryContainer);

  const pointsText = document.createElement("span");
  pointsText.textContent =
    player.points !== undefined && player.points !== null
      ? `${player.points} points`
      : "Points non disponibles";
  pointsText.style.fontSize = "0.75rem";
  pointsText.style.lineHeight = "1.66";
  pointsText.style.color = "rgba(0, 0, 0, 0.6)";
  pointsText.style.display = "block";
  textContainer.appendChild(pointsText);

  clonedContent.appendChild(textContainer);
  tempDiv.appendChild(clonedContent);

  return tempDiv;
};



