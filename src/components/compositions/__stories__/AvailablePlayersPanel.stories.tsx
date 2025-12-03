import { useMemo, useState, type ReactElement } from "react";
import { ListItem, ListItemText } from "@mui/material";
import { AvailablePlayersPanel } from "../AvailablePlayersPanel";
import type { Player } from "@/types/team-management";

const createPlayer = (id: string, name: string, points?: number): Player => ({
  id,
  name,
  firstName: "Test",
  license: `LIC-${id}`,
  typeLicence: "T",
  gender: id.endsWith("F") ? "F" : "M",
  nationality: "FR",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  preferredTeams: { masculine: [], feminine: [] },
  participation: {},
  ...(points !== undefined ? { points } : {}),
});

const players: Player[] = [
  createPlayer("1", "Martin", 980),
  createPlayer("2F", "Alice", 720),
  createPlayer("3", "Dubois"),
];

const meta = {
  title: "Compositions/Panels/AvailablePlayersPanel",
  component: AvailablePlayersPanel,
  parameters: { layout: "centered" },
};

export default meta;

type Story = { render: () => ReactElement };

const AvailablePlayersPanelPreview = () => {
  const [query, setQuery] = useState("");
  const filteredPlayers = useMemo(
    () =>
      players.filter((player) =>
        `${player.firstName} ${player.name}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <AvailablePlayersPanel
      title="Joueurs disponibles"
      subtitle="Filtrez et visualisez les joueurs prêts à être assignés"
      searchQuery={query}
      onSearchChange={setQuery}
      totalCount={players.length}
      filteredPlayers={filteredPlayers}
      renderPlayerItem={(player) => (
        <ListItem key={player.id} divider>
          <ListItemText
            primary={`${player.firstName} ${player.name}`}
            secondary={player.points ? `${player.points} points` : "Points inconnus"}
          />
        </ListItem>
      )}
      emptyMessage="Aucun joueur disponible"
      noResultMessage={(value) => `Aucun joueur ne correspond à "${value}"`}
      actions={<span>Actions personnalisées</span>}
      containerProps={{ maxWidth: 420 }}
    />
  );
};

export const Default: Story = {
  render: () => <AvailablePlayersPanelPreview />,
};
