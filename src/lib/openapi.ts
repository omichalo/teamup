export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SQY Ping Team Up API",
    version: "1.0.0",
    description:
      "API HTTP exposée par l'application SQY Ping Team Up (Next.js App Router). Toutes les routes utilisent un cookie de session Firebase (`__session`) pour l'authentification, sauf indication contraire.",
  },
  servers: [
    {
      url: "/",
    },
  ],
  components: {
    securitySchemes: {
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__session",
        description:
          "Cookie de session Firebase. Déposé par `/api/session` après login. Requis pour les routes protégées.",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          photoURL: { type: ["string", "null"], format: "uri" },
          role: {
            type: "string",
            enum: ["admin", "coach", "player"],
          },
          playerId: { type: ["string", "null"] },
          emailVerified: { type: "boolean" },
          coachRequestStatus: {
            type: "string",
            enum: ["none", "pending", "approved", "rejected"],
          },
          coachRequestMessage: { type: ["string", "null"] },
          coachRequestUpdatedAt: { type: ["string", "null"], format: "date-time" },
          coachRequestHandledBy: { type: ["string", "null"] },
          coachRequestHandledAt: { type: ["string", "null"], format: "date-time" },
          lastLoginAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "email", "role", "coachRequestStatus", "createdAt", "updatedAt"],
      },
      CoachRequestUpdate: {
        type: "object",
        properties: {
          userId: { type: "string" },
          action: { type: "string", enum: ["approve", "reject"] },
          role: {
            type: "string",
            enum: ["admin", "coach"],
            description:
              "Rôle cible si l'action est `approve`. Par défaut `coach` si non fourni ou invalide.",
          },
          message: {
            type: ["string", "null"],
            description: "Message d'explication ou commentaire de l'administrateur.",
          },
        },
        required: ["userId", "action"],
      },
      CoachRequestSubmission: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Message facultatif du joueur pour motiver sa demande.",
          },
        },
      },
      TeamSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          number: { type: "integer" },
          name: { type: "string" },
          division: { type: "string" },
          isFemale: { type: "boolean" },
        },
        required: ["id", "number", "name", "division"],
      },
      TeamMatch: {
        type: "object",
        description: "Match par équipe issu de la FFTT et/ou de Firestore.",
        properties: {
          id: { type: "string" },
          teamId: { type: "string" },
          opponent: { type: "string" },
          date: { type: "string", format: "date-time" },
          isHome: { type: "boolean" },
          phase: { type: "string" },
          journee: { type: "integer" },
          division: { type: "string" },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          details: { type: "string" },
        },
        required: ["error"],
      },
      Location: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "name"],
      },
      DiscordChannel: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
      DiscordMember: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          displayName: { type: "string" },
          discriminator: { type: "string" },
        },
        required: ["id", "username", "displayName"],
      },
    },
  },
  paths: {
    "/api/auth/send-verification": {
      post: {
        tags: ["Auth"],
        summary: "Envoi d'un email de vérification",
        description:
          "Génère un lien de vérification via Firebase Admin et envoie un email HTML via SMTP (Nodemailer) au format SQY Ping Team Up.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email envoyé ou en file d'attente.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Email manquant ou invalide." },
          "500": { description: "Erreur lors de l'envoi de l'email." },
        },
      },
    },
    "/api/auth/send-password-reset": {
      post: {
        tags: ["Auth"],
        summary: "Envoi d'un email de réinitialisation de mot de passe",
        description:
          "Génère un lien de réinitialisation via Firebase Admin et envoie un email HTML via SMTP.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Email de réinitialisation envoyé." },
          "400": { description: "Email manquant ou invalide." },
          "500": { description: "Erreur lors de l'envoi de l'email." },
        },
      },
    },
    "/api/session": {
      post: {
        tags: ["Session"],
        summary: "Création du cookie de session (__session)",
        description:
          "Accepte un `idToken` Firebase (email déjà vérifié), vérifie le token via Firebase Admin et crée un cookie HTTP-only `__session` valable 14 jours.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  idToken: { type: "string", description: "ID token Firebase côté client." },
                },
                required: ["idToken"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Session créée, cookie __session défini sur la réponse.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Token manquant ou invalide." },
          "401": { description: "Token expiré ou invalide." },
          "403": { description: "Email non vérifié." },
        },
      },
      delete: {
        tags: ["Session"],
        summary: "Destruction de la session",
        description: "Supprime le cookie `__session` côté serveur et révoque les refresh tokens Firebase.",
        responses: {
          "200": {
            description: "Session supprimée.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/session/verify": {
      get: {
        tags: ["Session"],
        summary: "Vérification de la session et récupération du profil utilisateur",
        description:
          "Lit le cookie `__session`, vérifie le token de session et renvoie un profil utilisateur simplifié (rôle, statut de la demande coach, etc.).",
        responses: {
          "200": {
            description:
              "Session valide ou non. Si aucune session n'est valide, `user` est `null`.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      anyOf: [
                        { $ref: "#/components/schemas/User" },
                        { type: "null" },
                      ],
                    },
                  },
                  required: ["user"],
                },
              },
            },
          },
        },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Liste des utilisateurs",
        description:
          "Liste les utilisateurs Firebase Auth enrichis avec leurs profils Firestore (rôle, demandes coach, dernières connexions...).",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Liste des utilisateurs.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    users: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                  },
                  required: ["success", "users"],
                },
              },
            },
          },
          "403": { description: "Accès refusé (non ADMIN)." },
        },
      },
    },
    "/api/admin/users/set-role": {
      post: {
        tags: ["Admin"],
        summary: "Modification du rôle d'un utilisateur",
        description:
          "Permet à un administrateur de modifier le rôle d'un utilisateur (player/coach/admin) et met à jour les custom claims Firebase + Firestore.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["admin", "coach", "player"],
                  },
                  coachRequestStatus: {
                    type: "string",
                    enum: ["none", "pending", "approved", "rejected"],
                  },
                  coachRequestMessage: { type: ["string", "null"] },
                  playerId: { type: ["string", "null"] },
                },
                required: ["userId", "role"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Rôle mis à jour.",
          },
          "400": { description: "Paramètres invalides." },
          "403": { description: "Accès refusé (non ADMIN)." },
        },
      },
    },
    "/api/admin/users/coach-request": {
      patch: {
        tags: ["Admin"],
        summary: "Traitement d'une demande de droits coach",
        description:
          "Permet à un administrateur d'approuver ou de rejeter une demande coach. Si approuvée, le rôle et les claims sont mis à jour.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CoachRequestUpdate" },
            },
          },
        },
        responses: {
          "200": { description: "Demande coach mise à jour." },
          "400": { description: "Paramètres invalides." },
          "403": { description: "Accès refusé (non ADMIN)." },
        },
      },
    },
    "/api/admin/sync-status": {
      get: {
        tags: ["Sync"],
        summary: "Statut des synchronisations FFTT",
        description:
          "Retourne les dates et compteurs des dernières synchronisations des joueurs, équipes et matchs par équipe.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Statut de synchronisation.",
          },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
        },
      },
    },
    "/api/admin/sync-players": {
      post: {
        tags: ["Sync"],
        summary: "Synchronisation des joueurs",
        description:
          "Déclenche une synchronisation des joueurs depuis la FFTT vers Firestore. Opération potentiellement longue.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "Synchronisation exécutée." },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
        },
      },
    },
    "/api/admin/sync-teams": {
      post: {
        tags: ["Sync"],
        summary: "Synchronisation des équipes et de leurs matchs",
        description:
          "Déclenche la synchronisation des équipes FFTT et de leurs matchs, puis sauvegarde en base.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "Synchronisation exécutée." },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
        },
      },
    },
    "/api/admin/sync-team-matches": {
      post: {
        tags: ["Sync"],
        summary: "Synchronisation des matchs par équipe",
        description:
          "Récupère les matchs FFTT pour toutes les équipes, les sauvegarde dans les sous-collections et met à jour les métadonnées.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "Synchronisation exécutée." },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
        },
      },
    },
    "/api/coach/request": {
      post: {
        tags: ["Coach"],
        summary: "Soumission d'une demande de droits coach",
        description:
          "Permet à un joueur (ou coach/admin) de soumettre une demande pour obtenir des droits coach.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CoachRequestSubmission" },
            },
          },
        },
        responses: {
          "200": { description: "Demande enregistrée." },
          "401": { description: "Authentification requise." },
          "403": { description: "Accès refusé." },
        },
      },
    },
    "/api/fftt/players": {
      get: {
        tags: ["FFTT"],
        summary: "Liste des joueurs FFTT en base",
        description:
          "Retourne les joueurs présents dans la collection Firestore `players`, triés par nombre de points décroissant.",
        parameters: [
          {
            name: "clubCode",
            in: "query",
            description: "Code FFTT du club (stocké pour information).",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Liste des joueurs.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    players: {
                      type: "array",
                      items: { type: "object" },
                    },
                    total: { type: "integer" },
                    clubCode: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Paramètre clubCode manquant." },
        },
      },
    },
    "/api/teams": {
      get: {
        tags: ["Equipes"],
        summary: "Liste des équipes",
        description:
          "Retourne la liste des équipes (résultats de la dernière synchronisation FFTT) depuis Firestore.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Liste des équipes.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    teams: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TeamSummary" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "403": { description: "Accès refusé (non ADMIN ou COACH avec email vérifié)." },
          "500": { description: "Erreur lors de la récupération des équipes." },
        },
      },
    },
    "/api/teams/matches": {
      get: {
        tags: ["Equipes"],
        summary: "Liste des matchs pour plusieurs équipes",
        description:
          "Retourne les matchs associés à une ou plusieurs équipes. Si aucun `teamIds` n'est fourni, toutes les équipes sont renvoyées.",
        parameters: [
          {
            name: "teamIds",
            in: "query",
            required: false,
            description:
              "Liste d'identifiants d'équipe séparés par des virgules (ex: `1_M,2_M`).",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Liste des matchs par équipe.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    teams: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          team: { $ref: "#/components/schemas/TeamSummary" },
                          matches: {
                            type: "array",
                            items: { $ref: "#/components/schemas/TeamMatch" },
                          },
                          total: { type: "integer" },
                        },
                      },
                    },
                    totalTeams: { type: "integer" },
                    totalMatches: { type: "integer" },
                  },
                },
              },
            },
          },
          "500": { description: "Erreur lors de la récupération des matchs." },
        },
      },
    },
    "/api/teams/{teamId}/matches": {
      get: {
        tags: ["Equipes"],
        summary: "Liste des matchs pour une équipe",
        description:
          "Retourne tous les matchs connus pour une équipe donnée (FireStore + synchronisations FFTT).",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            description: "Identifiant de l'équipe (clé Firestore).",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Liste des matchs pour l'équipe.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    teamId: { type: "string" },
                    matches: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TeamMatch" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "400": { description: "Paramètre teamId manquant ou invalide." },
          "401": { description: "Authentification requise." },
          "403": { description: "Accès refusé (email non vérifié)." },
          "500": { description: "Erreur lors de la récupération des matchs." },
        },
      },
    },
    "/api/admin/locations": {
      get: {
        tags: ["Admin"],
        summary: "Liste des lieux",
        description: "Retourne la liste de tous les lieux disponibles, triés par nom.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Liste des lieux.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    locations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Location" },
                    },
                  },
                },
              },
            },
          },
          "403": { description: "Accès refusé (non ADMIN avec email vérifié)." },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Création d'un lieu",
        description: "Crée un nouveau lieu dans la base de données.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nom du lieu" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Lieu créé avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    location: { $ref: "#/components/schemas/Location" },
                  },
                },
              },
            },
          },
          "400": { description: "Nom manquant, invalide ou lieu déjà existant." },
          "403": { description: "Accès refusé (non ADMIN avec email vérifié)." },
          "429": { description: "Trop de requêtes (rate limit)." },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Suppression d'un lieu",
        description: "Supprime un lieu de la base de données.",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            description: "Identifiant du lieu à supprimer.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Lieu supprimé avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "ID manquant ou invalide." },
          "403": { description: "Accès refusé (non ADMIN avec email vérifié)." },
          "429": { description: "Trop de requêtes (rate limit)." },
        },
      },
    },
    "/api/teams/{teamId}/location": {
      patch: {
        tags: ["Equipes"],
        summary: "Mise à jour du lieu d'une équipe",
        description: "Met à jour le lieu associé à une équipe. Peut être null pour supprimer le lieu.",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            description: "Identifiant de l'équipe (clé Firestore).",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  location: {
                    type: ["string", "null"],
                    description: "ID du lieu (dans la collection locations) ou null pour supprimer.",
                  },
                },
                required: ["location"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Lieu mis à jour avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        teamId: { type: "string" },
                        location: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Paramètres invalides ou lieu introuvable." },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
          "404": { description: "Équipe introuvable." },
        },
      },
    },
    "/api/teams/{teamId}/discord-channel": {
      patch: {
        tags: ["Equipes"],
        summary: "Mise à jour du canal Discord d'une équipe",
        description: "Met à jour le canal Discord associé à une équipe. Peut être null pour supprimer le canal.",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            description: "Identifiant de l'équipe (clé Firestore).",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  discordChannelId: {
                    type: ["string", "null"],
                    description: "ID du canal Discord ou null pour supprimer.",
                  },
                },
                required: ["discordChannelId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Canal Discord mis à jour avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        teamId: { type: "string" },
                        discordChannelId: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Paramètres invalides." },
          "403": { description: "Accès refusé (non ADMIN ou COACH avec email vérifié)." },
          "404": { description: "Équipe introuvable." },
        },
      },
    },
    "/api/discord/channels": {
      get: {
        tags: ["Discord"],
        summary: "Liste des canaux Discord",
        description:
          "Retourne la liste de tous les canaux textuels du serveur Discord, organisés par catégorie.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Liste des canaux Discord.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    channels: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DiscordChannel" },
                      description: "Format plat (tous les canaux textuels).",
                    },
                    hierarchy: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: {
                            type: ["object", "null"],
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              position: { type: "integer" },
                            },
                          },
                          channels: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                position: { type: "integer" },
                              },
                            },
                          },
                        },
                      },
                      description: "Structure hiérarchique (canaux organisés par catégorie).",
                    },
                  },
                },
              },
            },
          },
          "403": { description: "Accès refusé (non ADMIN ou COACH avec email vérifié)." },
          "500": { description: "Erreur lors de la récupération des canaux Discord." },
        },
      },
    },
    "/api/discord/members": {
      get: {
        tags: ["Discord"],
        summary: "Liste des membres Discord",
        description:
          "Retourne la liste de tous les membres non-bots du serveur Discord, triés par nom d'affichage.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Liste des membres Discord.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    members: {
                      type: "array",
                      items: { $ref: "#/components/schemas/DiscordMember" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Authentification requise." },
          "403": { description: "Accès refusé." },
          "500": { description: "Erreur lors de la récupération des membres Discord." },
        },
      },
    },
    "/api/discord/send-message": {
      post: {
        tags: ["Discord"],
        summary: "Envoi d'un message Discord",
        description:
          "Envoie un message dans un canal Discord pour une équipe et une journée/phase donnée. Le message est enregistré dans Firestore.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: {
                    type: "string",
                    description: "Contenu principal du message (composition d'équipe).",
                  },
                  teamId: { type: "string", description: "Identifiant de l'équipe." },
                  journee: {
                    type: "integer",
                    description: "Numéro de la journée.",
                  },
                  phase: {
                    type: "string",
                    enum: ["aller", "retour"],
                    description: "Phase du championnat.",
                  },
                  customMessage: {
                    type: "string",
                    description: "Message personnalisé optionnel à ajouter après le contenu principal.",
                  },
                  channelId: {
                    type: "string",
                    description: "ID du canal Discord où envoyer le message.",
                  },
                },
                required: ["content", "teamId", "journee", "phase", "channelId"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message envoyé avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Paramètres manquants ou invalides (content, teamId, journee, phase, channelId requis).",
          },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
          "500": { description: "Erreur lors de l'envoi du message Discord." },
        },
      },
    },
    "/api/discord/check-message-sent": {
      get: {
        tags: ["Discord"],
        summary: "Vérification de l'envoi d'un message Discord",
        description:
          "Vérifie si un message Discord a déjà été envoyé pour une ou plusieurs équipes, journée et phase données.",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "teamIds",
            in: "query",
            required: false,
            description:
              "Liste d'identifiants d'équipe séparés par des virgules (nouveau format). Maximum 50 équipes.",
            schema: { type: "string" },
          },
          {
            name: "teamId",
            in: "query",
            required: false,
            description: "Identifiant d'une équipe (ancien format, pour compatibilité).",
            schema: { type: "string" },
          },
          {
            name: "journee",
            in: "query",
            required: true,
            description: "Numéro de la journée.",
            schema: { type: "integer" },
          },
          {
            name: "phase",
            in: "query",
            required: true,
            description: "Phase du championnat.",
            schema: { type: "string", enum: ["aller", "retour"] },
          },
        ],
        responses: {
          "200": {
            description: "Statut d'envoi des messages.",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        sent: { type: "boolean" },
                        sentAt: { type: ["string", "null"], format: "date-time" },
                        customMessage: { type: "string" },
                      },
                      description: "Format simple (un seul teamId).",
                    },
                    {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        results: {
                          type: "object",
                          additionalProperties: {
                            type: "object",
                            properties: {
                              sent: { type: "boolean" },
                              sentAt: { type: ["string", "null"], format: "date-time" },
                              customMessage: { type: "string" },
                            },
                          },
                        },
                      },
                      description: "Format multiple (plusieurs teamIds).",
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Paramètres manquants ou invalides (journee, phase, teamIds/teamId requis).",
          },
          "403": { description: "Accès refusé (non ADMIN ou COACH avec email vérifié)." },
        },
      },
    },
    "/api/discord/update-custom-message": {
      post: {
        tags: ["Discord"],
        summary: "Mise à jour du message personnalisé",
        description:
          "Sauvegarde un message personnalisé pour une équipe, journée et phase données. Ce message sera ajouté au message principal lors de l'envoi.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  teamId: { type: "string", description: "Identifiant de l'équipe." },
                  journee: {
                    type: "integer",
                    description: "Numéro de la journée.",
                  },
                  phase: {
                    type: "string",
                    enum: ["aller", "retour"],
                    description: "Phase du championnat.",
                  },
                  customMessage: {
                    type: "string",
                    description: "Message personnalisé à sauvegarder.",
                  },
                },
                required: ["teamId", "journee", "phase"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Message personnalisé sauvegardé avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Paramètres manquants ou invalides (teamId, journee, phase requis).",
          },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
        },
      },
    },
  },
} as const;


