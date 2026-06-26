"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Group as GroupIcon,
  Groups as GroupsIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  Sports as SportsIcon,
} from "@mui/icons-material";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { COACH_REQUEST_STATUS, USER_ROLES } from "@/lib/auth/roles";
import { User, UserRole } from "@/types";
import { useDiscordMembers } from "@/hooks/useDiscordMembers";
import {
  DiscordAvailabilitySection,
  type DiscordMentionOption,
} from "@/components/admin/DiscordAvailabilitySection";
import { LocationsManagementSection } from "@/components/admin/LocationsManagementSection";
import { SyncOperationCard } from "@/components/admin/SyncOperationCard";
import { CoachRequestsSection } from "@/components/admin/CoachRequestsSection";
import { UsersManagementTable } from "@/components/admin/UsersManagementTable";
import { useUserAdminActions } from "@/components/admin/useUserAdminActions";
import { TabPanel } from "@/components/ui/TabPanel";

const ADMIN_TAB_PANEL_PROPS = {
  baseId: "admin",
  contentSx: { mt: 3 },
} as const;

interface SyncStatus {
  players: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error: string | null;
    duration: number | null;
  };
  teams: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error: string | null;
    duration: number | null;
  };
  teamMatches: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error: string | null;
    duration: number | null;
  };
}

export default function AdminPage() {
  const { user } = useAuth();

  const [tabValue, setTabValue] = useState(0);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    players: { lastSync: null, count: 0, status: "idle", error: null, duration: null },
    teams: { lastSync: null, count: 0, status: "idle", error: null, duration: null },
    teamMatches: { lastSync: null, count: 0, status: "idle", error: null, duration: null },
  });
  const [syncLoading, setSyncLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncInitialized, setSyncInitialized] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(
    null
  );
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSyncStatus = useCallback(async () => {
    if (!user) {
      return;
    }

    setSyncLoading(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/admin/sync-status", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus({
          players: {
            lastSync: result.data?.players?.lastSync || null,
            count: result.data?.players?.count || 0,
            status: "idle",
            error: null,
            duration: result.data?.players?.duration || null,
          },
          teams: {
            lastSync: result.data?.teams?.lastSync || null,
            count: result.data?.teams?.count || 0,
            status: "idle",
            error: null,
            duration: result.data?.teams?.duration || null,
          },
          teamMatches: {
            lastSync: result.data?.teamMatches?.lastSync || null,
            count: result.data?.teamMatches?.count || 0,
            status: "idle",
            error: null,
            duration: result.data?.teamMatches?.duration || null,
          },
        });
      } else {
        const errorMessage =
          result.error || result.message || "Erreur inconnue";
        setSyncError(errorMessage);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur réseau";
      setSyncError(errorMessage);
    } finally {
      setSyncLoading(false);
    }
  }, [user]);

  const handleSyncPlayers = useCallback(async () => {
    if (!user) {
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      players: { ...prev.players, status: "syncing", error: null },
    }));

    try {
      const response = await fetch("/api/admin/sync-players", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus((prev) => ({
          ...prev,
          players: {
            ...prev.players,
            lastSync: new Date().toISOString(),
            count: result.data?.playersCount || result.playersCount || 0,
            status: "success",
            error: null,
            duration: result.data?.duration || result.duration || null,
          },
        }));
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          players: {
            ...prev.players,
            status: "error",
            error: result.error || result.message || "Erreur inconnue",
          },
        }));
      }
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        players: {
          ...prev.players,
          status: "error",
          error: error instanceof Error ? error.message : "Erreur réseau",
        },
      }));
    }
  }, [user]);

  const handleSyncTeams = useCallback(async () => {
    if (!user) {
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      teams: { ...prev.teams, status: "syncing", error: null },
    }));

    try {
      const response = await fetch("/api/admin/sync-teams", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus((prev) => ({
          ...prev,
          teams: {
            ...prev.teams,
            lastSync: new Date().toISOString(),
            count: result.data?.teamsCount || 0,
            status: "success",
            error: null,
            duration: result.data?.duration || null,
          },
        }));
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          teams: {
            ...prev.teams,
            status: "error",
            error: result.error || result.message || "Erreur inconnue",
          },
        }));
      }
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        teams: {
          ...prev.teams,
          status: "error",
          error: error instanceof Error ? error.message : "Erreur réseau",
        },
      }));
    }
  }, [user]);

  const handleSyncTeamMatches = useCallback(async () => {
    if (!user) {
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      teamMatches: { ...prev.teamMatches, status: "syncing", error: null },
    }));

    try {
      const response = await fetch("/api/admin/sync-team-matches", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus((prev) => ({
          ...prev,
          teamMatches: {
            ...prev.teamMatches,
            lastSync: new Date().toISOString(),
            count: result.data?.matchesCount || 0,
            status: "success",
            error: null,
            duration: result.data?.duration || null,
          },
        }));
      } else {
        const errorMessage =
          result.details ||
          result.error ||
          result.message ||
          "Erreur inconnue";
        setSyncStatus((prev) => ({
          ...prev,
          teamMatches: {
            ...prev.teamMatches,
            status: "error",
            error: errorMessage,
          },
        }));
      }
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        teamMatches: {
          ...prev.teamMatches,
          status: "error",
          error: error instanceof Error ? error.message : "Erreur réseau",
        },
      }));
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoadingUsers(true);
    setUsersError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || "Impossible de récupérer les utilisateurs"
        );
      }

      const payload = await response.json();
      setUsers(payload.users ?? []);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      setUsersError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs"
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  const handleCoachRequestAction = useCallback(
    async (targetUserId: string, action: "approve" | "reject") => {
      if (!user) {
        return;
      }

      setProcessingUserId(targetUserId);
      setUsersError(null);
      setUserActionSuccess(null);

      try {
        // Si on approuve, on donne le rôle coach
        if (action === "approve") {
          const response = await fetch("/api/admin/users/coach-request", {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: targetUserId,
              action,
              role: USER_ROLES.COACH,
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error || "Échec de la mise à jour");
          }
        } else {
          const response = await fetch("/api/admin/users/coach-request", {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: targetUserId, action }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error || "Échec de la mise à jour");
          }
        }

        setUserActionSuccess(
          action === "approve"
            ? "Demande approuvée avec succès. L'utilisateur a maintenant le rôle coach."
            : "Demande rejetée"
        );
        await fetchUsers();
      } catch (error) {
        console.error("Erreur lors du traitement de la demande coach:", error);
        setUsersError(
          error instanceof Error
            ? error.message
            : "Impossible de traiter la demande"
        );
      } finally {
        setProcessingUserId(null);
      }
    },
    [fetchUsers, user]
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return users;
    }
    return users.filter((user) => {
      const combined = `${user.displayName ?? ""} ${
        user.email ?? ""
      }`.toLowerCase();
      return combined.includes(query);
    });
  }, [searchTerm, users]);

  const adminCount = useMemo(
    () => filteredUsers.filter((user) => user.role === USER_ROLES.ADMIN).length,
    [filteredUsers]
  );

  const pendingRequests = useMemo(
    () =>
      users.filter(
        (user) => user.coachRequestStatus === COACH_REQUEST_STATUS.PENDING
      ),
    [users]
  );

  const {
    roleUpdateTarget,
    maintainerUpdateTarget,
    handleRoleChange,
    handleAppMaintainerChange,
  } = useUserAdminActions({
    currentUserId: user?.id,
    adminCount,
    fetchUsers,
    setUsersError,
    setUserActionSuccess,
  });

  const coachRequestChipColor = (
    status: (typeof COACH_REQUEST_STATUS)[keyof typeof COACH_REQUEST_STATUS]
  ) => {
    switch (status) {
      case COACH_REQUEST_STATUS.APPROVED:
        return "success";
      case COACH_REQUEST_STATUS.PENDING:
        return "warning";
      case COACH_REQUEST_STATUS.REJECTED:
        return "error";
      default:
        return "default";
    }
  };

  const getRoleLabel = useCallback((role: UserRole) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "admin";
      case USER_ROLES.SECRETARY:
        return "secrétaire";
      case USER_ROLES.COACH:
        return "coach";
      default:
        return "joueur";
    }
  }, []);

  const getCoachStatusLabel = useCallback(
    (
      status: (typeof COACH_REQUEST_STATUS)[keyof typeof COACH_REQUEST_STATUS]
    ) => {
      switch (status) {
        case COACH_REQUEST_STATUS.PENDING:
          return "en attente";
        case COACH_REQUEST_STATUS.APPROVED:
          return "approuvée";
        case COACH_REQUEST_STATUS.REJECTED:
          return "refusée";
        default:
          return "aucune demande";
      }
    },
    []
  );

  useEffect(() => {
    if (!user || syncInitialized) {
      return;
    }
    setSyncInitialized(true);
    void fetchSyncStatus();
  }, [fetchSyncStatus, user, syncInitialized]);

  useEffect(() => {
    if (!user || !usersInitialized || tabValue !== 1) {
      return;
    }
    void fetchUsers();
  }, [fetchUsers, user, tabValue, usersInitialized]);

  useEffect(() => {
    if (tabValue === 1 && !usersInitialized) {
      setUsersInitialized(true);
    }
  }, [tabValue, usersInitialized]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue !== 1) {
      setUsersError(null);
      setUserActionSuccess(null);
    }
  };

  const getStatusChip = (
    status: SyncStatus["players"]["status"]
  ): React.ReactNode => {
    switch (status) {
      case "syncing":
        return (
          <Chip
            icon={<CircularProgress size={16} />}
            label="Synchronisation en cours..."
            color="info"
          />
        );
      case "success":
        return <Chip label="Synchronisé avec succès" color="success" />;
      case "error":
        return <Chip label="Erreur de synchronisation" color="error" />;
      default:
        return <Chip label="Prêt à synchroniser" color="default" />;
    }
  };

  const formatDuration = (durationSeconds: number | null): string => {
    if (durationSeconds === null || durationSeconds === undefined) {
      return "N/A";
    }
    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    }
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  };

  const formatLastSync = (lastSync: string | null): string => {
    if (!lastSync) {
      return "Jamais";
    }
    return new Date(lastSync).toLocaleString("fr-FR");
  };

  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN]}
      redirectWhenUnauthorized="/joueur"
    >
      <Box sx={{ p: 5 }}>
          <Typography variant="h4" gutterBottom>
            Administration
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Accédez aux opérations de synchronisation et à la gestion des
            utilisateurs.
          </Typography>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="Onglets d'administration"
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab
              label="Synchronisation FFTT"
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            />
            <Tab
              label="Gestion des utilisateurs"
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
            <Tab
              label="Lieux"
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
            <Tab
              label="Configuration Discord"
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
          </Tabs>

          <TabPanel {...ADMIN_TAB_PANEL_PROPS} value={tabValue} index={0}>
            {syncError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {syncError}
              </Alert>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchSyncStatus()}
              disabled={syncLoading}
              sx={{ mb: 3 }}
            >
              Actualiser le statut
            </Button>
            {syncLoading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "30vh",
                  gap: 2,
                }}
              >
                <CircularProgress size={48} />
                <Typography variant="h6" color="text.secondary">
                  Chargement des données de synchronisation...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <SyncOperationCard
                  title="Synchronisation des joueurs"
                  description="Synchronise la liste des joueurs du club depuis l'API FFTT."
                  lastSync={formatLastSync(syncStatus.players.lastSync)}
                  duration={formatDuration(syncStatus.players.duration)}
                  countLabel="Nombre de joueurs"
                  count={syncStatus.players.count}
                  statusChip={getStatusChip(syncStatus.players.status)}
                  error={syncStatus.players.error}
                  isSyncing={syncStatus.players.status === "syncing"}
                  syncingLabel="Synchronisation en cours..."
                  idleLabel="Synchroniser les joueurs"
                  idleIcon={<RefreshIcon />}
                  headerIcon={<GroupIcon sx={{ mr: 1, color: "primary.main" }} />}
                  onSync={() => handleSyncPlayers()}
                />

                <SyncOperationCard
                  title="Synchronisation des équipes"
                  description="Synchronise la liste des équipes du club depuis l'API FFTT."
                  lastSync={formatLastSync(syncStatus.teams.lastSync)}
                  duration={formatDuration(syncStatus.teams.duration)}
                  countLabel="Nombre d'équipes"
                  count={syncStatus.teams.count}
                  statusChip={getStatusChip(syncStatus.teams.status)}
                  error={syncStatus.teams.error}
                  isSyncing={syncStatus.teams.status === "syncing"}
                  syncingLabel="Synchronisation en cours..."
                  idleLabel="Synchroniser les équipes"
                  idleIcon={<GroupsIcon />}
                  headerIcon={<GroupsIcon sx={{ mr: 1, color: "primary.main" }} />}
                  onSync={() => handleSyncTeams()}
                />

                <SyncOperationCard
                  title="Synchronisation des matchs par équipe"
                  description="Synchronise les rencontres et résultats dans des collections dédiées."
                  lastSync={formatLastSync(syncStatus.teamMatches.lastSync)}
                  duration={formatDuration(syncStatus.teamMatches.duration)}
                  countLabel="Nombre de matchs"
                  count={syncStatus.teamMatches.count}
                  statusChip={getStatusChip(syncStatus.teamMatches.status)}
                  error={syncStatus.teamMatches.error}
                  isSyncing={syncStatus.teamMatches.status === "syncing"}
                  syncingLabel="Synchronisation en cours..."
                  idleLabel="Synchroniser les matchs par équipe"
                  idleIcon={<SportsIcon />}
                  headerIcon={<SportsIcon sx={{ mr: 1, color: "primary.main" }} />}
                  onSync={() => handleSyncTeamMatches()}
                />

                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <ScheduleIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6">
                        Synchronisation automatique
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Les données sont automatiquement synchronisées en
                      arrière-plan :
                    </Typography>

                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Joueurs :</strong> tous les jours à 6h00
                        (heure de Paris)
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Équipes :</strong> tous les jours à 6h05
                        (heure de Paris)
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Matchs par équipe :</strong> tous les jours à
                        6h10 (heure de Paris)
                      </Typography>
                      <Typography variant="body2">
                        • <strong>Détails des matchs :</strong> récupération
                        automatique des compositions et résultats après chaque
                        synchronisation quotidienne
                      </Typography>
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        La synchronisation manuelle peut durer plusieurs
                        minutes. Les synchronisations automatiques
                        s&apos;exécutent en arrière-plan sans bloquer
                        l&apos;application.
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </Box>
            )}
          </TabPanel>

          <TabPanel {...ADMIN_TAB_PANEL_PROPS} value={tabValue} index={1}>
            {usersError && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
                onClose={() => setUsersError(null)}
              >
                {usersError}
              </Alert>
            )}
            {userActionSuccess && (
              <Alert
                severity="success"
                sx={{ mb: 3 }}
                onClose={() => setUserActionSuccess(null)}
              >
                {userActionSuccess}
              </Alert>
            )}
            <CoachRequestsSection
              loading={loadingUsers}
              pendingRequests={pendingRequests}
              processingUserId={processingUserId}
              onCoachRequestAction={handleCoachRequestAction}
            />

            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", md: "center" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Tous les utilisateurs</Typography>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", md: "center" }}
                    sx={{ width: { xs: "100%", md: "auto" } }}
                  >
                    <TextField
                      size="small"
                      placeholder="Rechercher (nom ou email)"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: { xs: "100%", md: 260 } }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => fetchUsers()}
                      disabled={loadingUsers}
                    >
                      Actualiser la liste
                    </Button>
                  </Stack>
                </Box>

                {loadingUsers ? (
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={24} />
                    <Typography variant="body2">
                      Chargement des utilisateurs…
                    </Typography>
                  </Box>
                ) : filteredUsers.length === 0 ? (
                  <Alert severity="info">
                    {searchTerm.trim()
                      ? "Aucun utilisateur ne correspond à la recherche."
                      : "Aucun utilisateur trouvé."}
                  </Alert>
                ) : (
                  <Card variant="outlined">
                    <UsersManagementTable
                      users={filteredUsers}
                      currentUserId={user?.id}
                      adminCount={adminCount}
                      roleUpdateTarget={roleUpdateTarget}
                      maintainerUpdateTarget={maintainerUpdateTarget}
                      onRoleChange={handleRoleChange}
                      onAppMaintainerChange={handleAppMaintainerChange}
                      getRoleLabel={getRoleLabel}
                      getCoachStatusLabel={getCoachStatusLabel}
                      getCoachStatusColor={coachRequestChipColor}
                    />
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel {...ADMIN_TAB_PANEL_PROPS} value={tabValue} index={2}>
            <LocationsManagementSection />
          </TabPanel>

          <TabPanel {...ADMIN_TAB_PANEL_PROPS} value={tabValue} index={3}>
            <DiscordAvailabilityConfig />
          </TabPanel>
        </Box>
    </AuthGuard>
  );
}

// Composant de configuration Discord pour les sondages de disponibilité
function DiscordAvailabilityConfig() {
  const [config, setConfig] = useState<{
    parisChannelId: string | null;
    equipesChannelId: string | null;
    parisMention: string | null;
    equipesMention: string | null;
  }>({
    parisChannelId: null,
    equipesChannelId: null,
    parisMention: null,
    equipesMention: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [discordChannels, setDiscordChannels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [discordChannelsHierarchy, setDiscordChannelsHierarchy] = useState<
    Array<{
      category: { id: string; name: string; position: number } | null;
      channels: Array<{ id: string; name: string; position: number }>;
    }>
  >([]);
  const [discordRoles, setDiscordRoles] = useState<
    Array<{ id: string; name: string; color: number }>
  >([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const { members: discordMembers } = useDiscordMembers();

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/discord-availability-config", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setConfig({
          parisChannelId: result.config?.parisChannelId || null,
          equipesChannelId: result.config?.equipesChannelId || null,
          parisMention: result.config?.parisMention || null,
          equipesMention: result.config?.equipesMention || null,
        });
      } else {
        setError(result.error || "Erreur lors de la récupération de la configuration");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Erreur réseau"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiscordChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const response = await fetch("/api/discord/channels", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setDiscordChannels(result.channels || []);
        setDiscordChannelsHierarchy(result.hierarchy || []);
      } else {
        console.error("Erreur lors de la récupération des channels Discord:", result.error);
      }
    } catch (error) {
      console.error("Erreur réseau lors de la récupération des channels:", error);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  const fetchDiscordRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const response = await fetch("/api/discord/roles", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setDiscordRoles(result.roles || []);
        if (result.roles && result.roles.length === 0) {
          console.warn("[Discord Roles] Aucun rôle mentionnable trouvé. Vérifiez que les rôles sont configurés comme 'mentionnables' dans Discord.");
        }
      } else {
        console.error("Erreur lors de la récupération des rôles Discord:", result.error);
      }
    } catch (error) {
      console.error("Erreur réseau lors de la récupération des rôles:", error);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
    void fetchDiscordChannels();
    void fetchDiscordRoles();
  }, [fetchConfig, fetchDiscordChannels, fetchDiscordRoles]);

  // Combiner utilisateurs et rôles pour l'autocomplete
  const mentionOptions: DiscordMentionOption[] = useMemo(() => {
    const users: DiscordMentionOption[] = (discordMembers || []).map((member) => ({
      id: member.id,
      name: member.username,
      type: "user" as const,
      displayName: member.displayName,
    }));
    const roles: DiscordMentionOption[] = (discordRoles || []).map((role) => ({
      id: role.id,
      name: role.name,
      type: "role" as const,
      displayName: role.name,
    }));
    return [...users, ...roles];
  }, [discordMembers, discordRoles]);

  // Convertir une mention (format Discord) en option pour l'autocomplete
  const parseMentionToOption = (mention: string | null): DiscordMentionOption | null => {
    if (!mention) return null;
    // Format: <@userId> ou <@&roleId>
    const userMatch = mention.match(/^<@(\d+)>$/);
    const roleMatch = mention.match(/^<@&(\d+)>$/);
    
    if (userMatch) {
      const userId = userMatch[1];
      const member = discordMembers.find((m) => m.id === userId);
      if (member) {
        return {
          id: member.id,
          name: member.username,
          type: "user",
          displayName: member.displayName,
        };
      }
    } else if (roleMatch) {
      const roleId = roleMatch[1];
      const role = discordRoles.find((r) => r.id === roleId);
      if (role) {
        return {
          id: role.id,
          name: role.name,
          type: "role",
          displayName: role.name,
        };
      }
    }
    return null;
  };

  // Convertir une option en mention Discord
  const optionToMention = (option: DiscordMentionOption | null): string | null => {
    if (!option) return null;
    if (option.type === "user") {
      return `<@${option.id}>`;
    } else {
      return `<@&${option.id}>`;
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/discord-availability-config", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parisChannelId: config.parisChannelId || null,
          equipesChannelId: config.equipesChannelId || null,
          parisMention: config.parisMention || null,
          equipesMention: config.equipesMention || null,
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess("Configuration sauvegardée avec succès");
        setConfig({
          parisChannelId: result.config?.parisChannelId || null,
          equipesChannelId: result.config?.equipesChannelId || null,
          parisMention: result.config?.parisMention || null,
          equipesMention: result.config?.equipesMention || null,
        });
      } else {
        setError(result.error || "Erreur lors de la sauvegarde de la configuration");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Erreur réseau"
      );
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={2}>
        <CircularProgress size={24} />
        <Typography variant="body2">Chargement de la configuration…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Stack spacing={3}>
        <DiscordAvailabilitySection
          title="Championnat de Paris"
          channelId={config.parisChannelId}
          mention={config.parisMention}
          channels={discordChannels}
          channelsHierarchy={discordChannelsHierarchy}
          mentionOptions={mentionOptions}
          loadingChannels={loadingChannels}
          loadingRoles={loadingRoles}
          loadingMentions={discordMembers.length === 0 || loadingRoles}
          saving={saving}
          onRefresh={() => {
            void fetchDiscordChannels();
            void fetchDiscordRoles();
          }}
          onChannelChange={(channelId) => {
            setConfig((prev) => ({
              ...prev,
              parisChannelId: channelId,
            }));
          }}
          onMentionChange={(mention) => {
            setConfig((prev) => ({
              ...prev,
              parisMention: mention,
            }));
          }}
          parseMentionToOption={parseMentionToOption}
          optionToMention={optionToMention}
        />

        <DiscordAvailabilitySection
          title="Championnat par équipes"
          channelId={config.equipesChannelId}
          mention={config.equipesMention}
          channels={discordChannels}
          channelsHierarchy={discordChannelsHierarchy}
          mentionOptions={mentionOptions}
          loadingChannels={loadingChannels}
          loadingRoles={loadingRoles}
          loadingMentions={discordMembers.length === 0 || loadingRoles}
          saving={saving}
          onRefresh={() => {
            void fetchDiscordChannels();
            void fetchDiscordRoles();
          }}
          onChannelChange={(channelId) => {
            setConfig((prev) => ({
              ...prev,
              equipesChannelId: channelId,
            }));
          }}
          onMentionChange={(mention) => {
            setConfig((prev) => ({
              ...prev,
              equipesMention: mention,
            }));
          }}
          parseMentionToOption={parseMentionToOption}
          optionToMention={optionToMention}
        />

        {/* Boutons d'action */}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            onClick={() => void fetchConfig()}
            disabled={saving || loading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving || loadingChannels || loadingRoles}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
