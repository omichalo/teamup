import { useState, type ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { EpreuveSelect } from "../Filters/EpreuveSelect";
import { PhaseSelect } from "../Filters/PhaseSelect";
import { SearchInput } from "../Filters/SearchInput";
import { TabPanel } from "../Filters/TabPanel";
import { TeamPicker } from "../Filters/TeamPicker";

const meta = {
  title: "Compositions/Filters",
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = { render: () => ReactElement };

const FiltersPlaygroundComponent = () => {
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<"aller" | "retour" | null>("aller");
  const [epreuve, setEpreuve] = useState<
    "championnat_equipes" | "championnat_paris" | null
  >("championnat_equipes");
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ width: 500 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Filtres disponibles</Typography>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un joueur"
        />
        <Stack direction="row" spacing={2}>
          <PhaseSelect value={phase} onChange={setPhase} />
          <EpreuveSelect value={epreuve} onChange={setEpreuve} />
        </Stack>
        <TeamPicker value={tab} onChange={(_, value) => setTab(value)} />
        <TabPanel value={tab} index={0}>
          <Typography variant="body2" color="text.secondary">
            Liste des équipes masculines (onglet actif: {tab})
          </Typography>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Typography variant="body2" color="text.secondary">
            Liste des équipes féminines (onglet actif: {tab})
          </Typography>
        </TabPanel>
      </Stack>
    </Box>
  );
};

export const FiltersPlayground: Story = {
  render: () => <FiltersPlaygroundComponent />,
};
