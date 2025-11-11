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
  Stack,
  Tab,
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
  };
  teams: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error: string | null;
  };
  teamMatches: {
    lastSync: string | null;
    count: number;
    status: "idle" | "syncing" | "success" | "error";
    error: string | null;
  };
}

export default function AdminPage() {
  const { firebaseUser } = useAuth();

  const [tabValue, setTabValue] = useState(0);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    players: { lastSync: null, count: 0, status: "idle", error: null },
    teams: { lastSync: null, count: 0, status: "idle", error: null },
    teamMatches: { lastSync: null, count: 0, status: "idle", error: null },
  });
  const [syncLoading, setSyncLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncInitialized, setSyncInitialized] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [usersInitialized, setUsersInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleUpdateTarget, setRoleUpdateTarget] = useState<string | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    setSyncLoading(true);
    setSyncError(null);

    try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch("/api/admin/sync-status", {
          headers: {
            Authorization: `Bearer ${token}`,
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
            },
            teams: {
              lastSync: result.data?.teams?.lastSync || null,
              count: result.data?.teams?.count || 0,
              status: "idle",
              error: null,
            },
            teamMatches: {
              lastSync: result.data?.teamMatches?.lastSync || null,
              count: result.data?.teamMatches?.count || 0,
              status: "idle",
              error: null,
            },
          });
        } else {
        const errorMessage = result.error || result.message || "Erreur inconnue";
        setSyncError(errorMessage);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur réseau";
      setSyncError(errorMessage);
      } finally {
      setSyncLoading(false);
    }
  }, [firebaseUser]);

  const handleSyncPlayers = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      players: { ...prev.players, status: "syncing", error: null },
    }));

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/admin/sync-players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setSyncStatus((prev) => ({
          ...prev,
          players: {
            ...prev.players,
            lastSync: new Date().toISOString(),
            count: result.data?.playersCount || 0,
            status: "success",
            error: null,
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
  }, [firebaseUser]);

  const handleSyncTeams = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      teams: { ...prev.teams, status: "syncing", error: null },
    }));

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/admin/sync-teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  }, [firebaseUser]);

  const handleSyncTeamMatches = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    setSyncStatus((prev) => ({
      ...prev,
      teamMatches: { ...prev.teamMatches, status: "syncing", error: null },
    }));

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/admin/sync-team-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
  }, [firebaseUser]);

  const fetchUsers = useCallback(async () => {
    if (!firebaseUser) {
      return;
    }

    setLoadingUsers(true);
    setUsersError(null);

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Impossible de récupérer les utilisateurs");
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
  }, [firebaseUser]);

  const handleCoachRequestAction = useCallback(
    async (targetUserId: string, action: "approve" | "reject") => {
      if (!firebaseUser) {
        return;
      }

      setProcessingUserId(targetUserId);
      setUsersError(null);
      setUserActionSuccess(null);

      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch("/api/admin/users/coach-request", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: targetUserId, action }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || "Échec de la mise à jour");
        }

        setUserActionSuccess(
          action === "approve"
            ? "Demande approuvée avec succès"
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
    [fetchUsers, firebaseUser]
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return users;
    }
    return users.filter((user) => {
      const combined = `${user.displayName ?? ""} ${user.email ?? ""}`.toLowerCase();
      return combined.includes(query);
    });
  }, [searchTerm, users]);

  const adminCount = useMemo(
    () => filteredUsers.filter((user) => user.role === USER_ROLES.ADMIN).length,
    [filteredUsers]
  );

  const pendingRequests = useMemo(
    () => users.filter((user) => user.coachRequestStatus === COACH_REQUEST_STATUS.PENDING),
    [users]
  );

  const coachRequestChipColor = (
    status: typeof COACH_REQUEST_STATUS[keyof typeof COACH_REQUEST_STATUS]
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
      if (!firebaseUser) {
        return;
      }

      if (
        targetUser.role === USER_ROLES.ADMIN &&
        newRole !== USER_ROLES.ADMIN &&
        adminCount <= 1
      ) {
        setUsersError("Impossible de retirer les droits du dernier administrateur.");
        setUserActionSuccess(null);
        return;
      }

      const targetKey = `${targetUser.id}-${newRole}`;
      setRoleUpdateTarget(targetKey);
      setUsersError(null);
      setUserActionSuccess(null);

      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch("/api/admin/users/set-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
    [adminCount, fetchUsers, firebaseUser]
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
    (status: typeof COACH_REQUEST_STATUS[keyof typeof COACH_REQUEST_STATUS]) => {
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
    if (!firebaseUser || syncInitialized) {
      return;
    }
    setSyncInitialized(true);
    void fetchSyncStatus();
  }, [fetchSyncStatus, firebaseUser, syncInitialized]);

  useEffect(() => {
    if (!firebaseUser || !usersInitialized || tabValue !== 1) {
      return;
    }
    void fetchUsers();
  }, [fetchUsers, firebaseUser, tabValue, usersInitialized]);

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

  const formatLastSync = (lastSync: string | null): string => {
    if (!lastSync) {
      return "Jamais";
    }
    return new Date(lastSync).toLocaleString("fr-FR");
  };

  const roleButtons = useMemo<
    Array<{
      value: UserRole;
      label: string;
      activeLabel: string;
      color: "primary" | "secondary" | "success";
    }>
  >(
    () => [
      {
        value: USER_ROLES.PLAYER,
        label: "Définir joueur",
        activeLabel: "Déjà joueur",
        color: "primary",
      },
      {
        value: USER_ROLES.COACH,
        label: "Définir coach",
        activeLabel: "Déjà coach",
        color: "success",
      },
      {
        value: USER_ROLES.ADMIN,
        label: "Définir admin",
        activeLabel: "Déjà admin",
        color: "secondary",
      },
    ],
    []
  );

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
            Accédez aux opérations de synchronisation et à la gestion des utilisateurs.
        </Typography>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="Onglets d'administration"
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="Synchronisation FFTT" id="admin-tab-0" aria-controls="admin-tabpanel-0" />
            <Tab label="Gestion des utilisateurs" id="admin-tab-1" aria-controls="admin-tabpanel-1" />
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
                      <Typography variant="h6">Synchronisation des joueurs</Typography>
                  </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Synchronise la liste des joueurs du club depuis l&apos;API FFTT.
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Dernière synchronisation :</strong>{" "}
                      {formatLastSync(syncStatus.players.lastSync)}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Nombre de joueurs :</strong> {syncStatus.players.count}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      <Typography variant="h6">Synchronisation des équipes</Typography>
                  </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Synchronise la liste des équipes du club depuis l&apos;API FFTT.
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Dernière synchronisation :</strong>{" "}
                      {formatLastSync(syncStatus.teams.lastSync)}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Nombre d&apos;équipes :</strong> {syncStatus.teams.count}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Synchronise les rencontres et résultats dans des collections dédiées.
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Dernière synchronisation :</strong>{" "}
                      {formatLastSync(syncStatus.teamMatches.lastSync)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Nombre de matchs :</strong>{" "}
                      {syncStatus.teamMatches.count}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      <Typography variant="h6">Synchronisation automatique</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Les données sont automatiquement synchronisées en arrière-plan :
                  </Typography>

                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Joueurs :</strong> tous les jours à 6h00 (heure de Paris)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Équipes :</strong> tous les jours à 6h05 (heure de Paris)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        • <strong>Matchs par équipe :</strong> tous les jours à 6h10 (heure de Paris)
                    </Typography>
                    <Typography variant="body2">
                        • <strong>Détails des matchs :</strong> récupération automatique des compositions et résultats après chaque synchronisation quotidienne
                    </Typography>
                  </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        La synchronisation manuelle peut durer plusieurs minutes. Les synchronisations automatiques s&apos;exécutent en arrière-plan sans bloquer l&apos;application.
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
                    <Typography variant="body2">Chargement des demandes…</Typography>
                  </Box>
                ) : pendingRequests.length === 0 ? (
                  <Alert severity="info">Aucune demande coach en attente.</Alert>
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
                              <Typography variant="body2" color="text.secondary">
                                Message : {pendingUser.coachRequestMessage}
                              </Typography>
                            ) : null}
                            <Stack direction="row" spacing={2}>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() => handleCoachRequestAction(pendingUser.id, "approve")}
                                disabled={processingUserId === pendingUser.id}
                              >
                                Approuver
                              </Button>
                              <Button
                                variant="outlined"
                                color="inherit"
                                startIcon={<CloseIcon />}
                                onClick={() => handleCoachRequestAction(pendingUser.id, "reject")}
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
                    <Typography variant="body2">Chargement des utilisateurs…</Typography>
                  </Box>
                ) : filteredUsers.length === 0 ? (
                  <Alert severity="info">
                    {searchTerm.trim()
                      ? "Aucun utilisateur ne correspond à la recherche."
                      : "Aucun utilisateur trouvé."}
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {filteredUsers.map((user) => {
                      const hasDisplayName =
                        user.displayName && user.displayName.trim().length > 0;

                      return (
                        <Box
                          key={user.id}
                          sx={{
                            display: "flex",
                            flexDirection: { xs: "column", lg: "row" },
                            alignItems: { lg: "center" },
                            gap: { xs: 2, lg: 3 },
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            px: { xs: 1.5, lg: 2 },
                            py: { xs: 1.5, lg: 1.5 },
                            backgroundColor: "background.paper",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            flexShrink={0}
                            sx={{ minWidth: { lg: 220 } }}
                          >
                            <Avatar
                              {...(user.photoURL && { src: user.photoURL })}
                              alt={user.displayName}
                              sx={{ width: 40, height: 40 }}
                            >
                              {user.displayName?.charAt(0) || user.email.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                sx={{ lineHeight: 1.2 }}
                              >
                                {hasDisplayName ? user.displayName : user.email}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ opacity: hasDisplayName ? 1 : 0.65 }}
                              >
                                {user.email}
                              </Typography>
                            </Box>
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              label={`Rôle : ${getRoleLabel(user.role)}`}
                              color={
                                user.role === USER_ROLES.ADMIN
                                  ? "secondary"
                                  : user.role === USER_ROLES.COACH
                                  ? "success"
                                  : "default"
                              }
                              size="small"
                              sx={{ fontWeight: 600, textTransform: "none" }}
                            />
                            <Chip
                              label={`Demande coach : ${getCoachStatusLabel(
                                user.coachRequestStatus
                              )}`}
                              color={coachRequestChipColor(user.coachRequestStatus)}
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 500, textTransform: "none" }}
                            />
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            justifyContent={{ xs: "flex-start", lg: "flex-end" }}
                            sx={{ width: { lg: "100%" } }}
                          >
                            {roleButtons.map((option) => {
                              const buttonKey = `${user.id}-${option.value}`;
                              const isCurrentRole = user.role === option.value;
                              const isUpdatingThis = roleUpdateTarget === buttonKey;
                              const wouldDemoteLastAdmin =
                                user.role === USER_ROLES.ADMIN &&
                                option.value !== USER_ROLES.ADMIN &&
                                adminCount <= 1;
                              const isDisabled =
                                isCurrentRole ||
                                wouldDemoteLastAdmin ||
                                (roleUpdateTarget !== null && !isUpdatingThis);

                              return (
                                <Button
                                  key={option.value}
                                  variant={isCurrentRole ? "contained" : "outlined"}
                                  color={option.color}
                                  size="small"
                                  onClick={() => handleRoleChange(user, option.value)}
                                  disabled={isDisabled}
                                  startIcon={
                                    isUpdatingThis ? (
                                      <CircularProgress size={16} color="inherit" />
                                    ) : undefined
                                  }
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    height: 34,
                                    px: 1.8,
                                    borderRadius: 999,
                                    color: isCurrentRole ? "common.white" : undefined,
                                    opacity: wouldDemoteLastAdmin ? 0.6 : 1,
                                  }}
                                  title={
                                    wouldDemoteLastAdmin
                                      ? "Au moins un administrateur doit rester actif."
                                      : undefined
                                  }
                                >
                                  {isCurrentRole ? option.activeLabel : option.label}
                                </Button>
                              );
                            })}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
        )}
              </CardContent>
            </Card>
          </TabPanel>
      </Box>
    </Layout>
    </AuthGuard>
  );
}
