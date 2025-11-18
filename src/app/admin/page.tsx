"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Group as GroupIcon,
  Groups as GroupsIcon,
  ManageAccounts as ManageAccountsIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  Sports as SportsIcon,
} from "@mui/icons-material";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { COACH_REQUEST_STATUS, USER_ROLES } from "@/lib/auth/roles";
import { User, UserRole } from "@/types";

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
    >
      {value === index ? <Box sx={{ mt: 3 }}>{children}</Box> : null}
    </div>
  );
}

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
  const [roleUpdateTarget, setRoleUpdateTarget] = useState<string | null>(null);

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
        setSyncStatus((prev) => ({
          ...prev,
          teamMatches: {
            ...prev.teamMatches,
            status: "error",
            error: result.error || result.message || "Erreur inconnue",
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

  const handleRoleChange = useCallback(
    async (targetUser: User, newRole: UserRole) => {
      if (!user) {
        return;
      }

      if (
        targetUser.role === USER_ROLES.ADMIN &&
        newRole !== USER_ROLES.ADMIN &&
        adminCount <= 1
      ) {
        setUsersError(
          "Impossible de retirer les droits du dernier administrateur."
        );
        setUserActionSuccess(null);
        return;
      }

      const targetKey = `${targetUser.id}-${newRole}`;
      setRoleUpdateTarget(targetKey);
      setUsersError(null);
      setUserActionSuccess(null);

      try {
        const response = await fetch("/api/admin/users/set-role", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: targetUser.id,
            role: newRole,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Échec de la mise à jour du rôle");
        }

        setUserActionSuccess("Rôle mis à jour avec succès.");
        await fetchUsers();
      } catch (error) {
        console.error("Erreur lors de la mise à jour du rôle:", error);
        setUsersError(
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le rôle"
        );
      } finally {
        setRoleUpdateTarget(null);
      }
    },
    [adminCount, fetchUsers, user]
  );

  const getRoleLabel = useCallback((role: UserRole) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return "admin";
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
      <Layout>
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
          </Tabs>

          <TabPanel value={tabValue} index={0}>
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
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <GroupIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6">
                        Synchronisation des joueurs
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Synchronise la liste des joueurs du club depuis l&apos;API
                      FFTT.
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Dernière synchronisation :</strong>{" "}
                        {formatLastSync(syncStatus.players.lastSync)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Durée :</strong>{" "}
                        {formatDuration(syncStatus.players.duration)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nombre de joueurs :</strong>{" "}
                        {syncStatus.players.count}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" component="span">
                          <strong>Statut :</strong>
                        </Typography>
                        {getStatusChip(syncStatus.players.status)}
                      </Box>
                    </Box>

                    {syncStatus.players.error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {syncStatus.players.error}
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      startIcon={
                        syncStatus.players.status === "syncing" ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <RefreshIcon />
                        )
                      }
                      onClick={() => handleSyncPlayers()}
                      disabled={syncStatus.players.status === "syncing"}
                      fullWidth
                    >
                      {syncStatus.players.status === "syncing"
                        ? "Synchronisation en cours..."
                        : "Synchroniser les joueurs"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <GroupsIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6">
                        Synchronisation des équipes
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Synchronise la liste des équipes du club depuis l&apos;API
                      FFTT.
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Dernière synchronisation :</strong>{" "}
                        {formatLastSync(syncStatus.teams.lastSync)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Durée :</strong>{" "}
                        {formatDuration(syncStatus.teams.duration)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nombre d&apos;équipes :</strong>{" "}
                        {syncStatus.teams.count}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" component="span">
                          <strong>Statut :</strong>
                        </Typography>
                        {getStatusChip(syncStatus.teams.status)}
                      </Box>
                    </Box>

                    {syncStatus.teams.error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {syncStatus.teams.error}
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      startIcon={
                        syncStatus.teams.status === "syncing" ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <GroupsIcon />
                        )
                      }
                      onClick={() => handleSyncTeams()}
                      disabled={syncStatus.teams.status === "syncing"}
                      fullWidth
                    >
                      {syncStatus.teams.status === "syncing"
                        ? "Synchronisation en cours..."
                        : "Synchroniser les équipes"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <SportsIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography variant="h6">
                        Synchronisation des matchs par équipe
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Synchronise les rencontres et résultats dans des
                      collections dédiées.
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Dernière synchronisation :</strong>{" "}
                        {formatLastSync(syncStatus.teamMatches.lastSync)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Durée :</strong>{" "}
                        {formatDuration(syncStatus.teamMatches.duration)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nombre de matchs :</strong>{" "}
                        {syncStatus.teamMatches.count}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" component="span">
                          <strong>Statut :</strong>
                        </Typography>
                        {getStatusChip(syncStatus.teamMatches.status)}
                      </Box>
                    </Box>

                    {syncStatus.teamMatches.error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {syncStatus.teamMatches.error}
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      startIcon={
                        syncStatus.teamMatches.status === "syncing" ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <SportsIcon />
                        )
                      }
                      onClick={() => handleSyncTeamMatches()}
                      disabled={syncStatus.teamMatches.status === "syncing"}
                      fullWidth
                    >
                      {syncStatus.teamMatches.status === "syncing"
                        ? "Synchronisation en cours..."
                        : "Synchroniser les matchs par équipe"}
                    </Button>
                  </CardContent>
                </Card>

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

          <TabPanel value={tabValue} index={1}>
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
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <ManageAccountsIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6">Demandes de droits coach</Typography>
                </Box>
                {loadingUsers ? (
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={24} />
                    <Typography variant="body2">
                      Chargement des demandes…
                    </Typography>
                  </Box>
                ) : pendingRequests.length === 0 ? (
                  <Alert severity="info">
                    Aucune demande coach en attente.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {pendingRequests.map((pendingUser) => (
                      <Card key={pendingUser.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {pendingUser.displayName || pendingUser.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Email : {pendingUser.email}
                            </Typography>
                            {pendingUser.coachRequestMessage ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Message : {pendingUser.coachRequestMessage}
                              </Typography>
                            ) : null}
                            <Stack direction="row" spacing={2}>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() =>
                                  handleCoachRequestAction(
                                    pendingUser.id,
                                    "approve"
                                  )
                                }
                                disabled={processingUserId === pendingUser.id}
                              >
                                Approuver
                              </Button>
                              <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<CloseIcon />}
                                onClick={() =>
                                  handleCoachRequestAction(
                                    pendingUser.id,
                                    "reject"
                                  )
                                }
                                disabled={processingUserId === pendingUser.id}
                              >
                                Rejeter
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

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
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: "action.hover" }}>
                          <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>
                            Utilisateur
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>
                            Rôle
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>
                            Email vérifié
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            Demande coach
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredUsers.map((targetUser) => {
                          const hasDisplayName =
                            targetUser.displayName &&
                            targetUser.displayName.trim().length > 0;
                          const isCurrentUser = targetUser.id === user?.uid;
                          const isLastAdmin =
                            targetUser.role === USER_ROLES.ADMIN &&
                            adminCount <= 1;

                          return (
                            <TableRow
                              key={targetUser.id}
                              sx={{
                                "&:hover": {
                                  backgroundColor: "action.hover",
                                },
                              }}
                            >
                              {/* Colonne Utilisateur */}
                              <TableCell>
                                <Stack
                                  direction="row"
                                  spacing={2}
                                  alignItems="center"
                                >
                                  <Avatar
                                    {...(targetUser.photoURL && {
                                      src: targetUser.photoURL,
                                    })}
                                    alt={targetUser.displayName}
                                    sx={{ width: 48, height: 48 }}
                                  >
                                    {targetUser.displayName?.charAt(0) ||
                                      targetUser.email.charAt(0)}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight={600}
                                      sx={{
                                        lineHeight: 1.2,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {hasDisplayName
                                        ? targetUser.displayName
                                        : targetUser.email}
                                    </Typography>
                                    {hasDisplayName && (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {targetUser.email}
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>
                              </TableCell>

                              {/* Colonne Rôle */}
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Select
                                    value={targetUser.role}
                                    onChange={(e) => {
                                      const newRole = e.target
                                        .value as UserRole;
                                      if (newRole !== targetUser.role) {
                                        handleRoleChange(targetUser, newRole);
                                      }
                                    }}
                                    disabled={
                                      (roleUpdateTarget !== null &&
                                        roleUpdateTarget.startsWith(
                                          `${targetUser.id}-`
                                        )) ||
                                      isLastAdmin ||
                                      isCurrentUser
                                    }
                                    size="small"
                                    sx={{
                                      minWidth: 150,
                                      textTransform: "none",
                                      "& .MuiSelect-select": {
                                        fontWeight: 600,
                                      },
                                    }}
                                  >
                                    <MenuItem value={USER_ROLES.PLAYER}>
                                      {getRoleLabel(USER_ROLES.PLAYER)}
                                    </MenuItem>
                                    <MenuItem value={USER_ROLES.COACH}>
                                      {getRoleLabel(USER_ROLES.COACH)}
                                    </MenuItem>
                                    <MenuItem
                                      value={USER_ROLES.ADMIN}
                                      disabled={
                                        targetUser.role === USER_ROLES.ADMIN &&
                                        adminCount <= 1
                                      }
                                    >
                                      {getRoleLabel(USER_ROLES.ADMIN)}
                                    </MenuItem>
                                  </Select>
                                  {roleUpdateTarget !== null &&
                                    roleUpdateTarget.startsWith(
                                      `${targetUser.id}-`
                                    ) && <CircularProgress size={20} />}
                                </Box>
                              </TableCell>

                              {/* Colonne Email vérifié */}
                              <TableCell>
                                <Chip
                                  label={
                                    targetUser.emailVerified
                                      ? "Vérifié"
                                      : "Non vérifié"
                                  }
                                  color={
                                    targetUser.emailVerified
                                      ? "success"
                                      : "warning"
                                  }
                                  variant="outlined"
                                  size="small"
                                  sx={{
                                    fontWeight: 500,
                                    textTransform: "none",
                                  }}
                                />
                              </TableCell>

                              {/* Colonne Demande coach */}
                              <TableCell>
                                {targetUser.coachRequestStatus !==
                                COACH_REQUEST_STATUS.NONE ? (
                                  <Chip
                                    label={getCoachStatusLabel(
                                      targetUser.coachRequestStatus
                                    )}
                                    color={coachRequestChipColor(
                                      targetUser.coachRequestStatus
                                    )}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                      fontWeight: 500,
                                      textTransform: "none",
                                    }}
                                  />
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.disabled"
                                  >
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      </Layout>
    </AuthGuard>
  );
}
