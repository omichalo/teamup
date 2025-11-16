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
      CompositionValidation: {
        type: "object",
        description: "Résultat de la validation de composition (brûlage, règles FFTT, etc.).",
        properties: {
          isValid: { type: "boolean" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                playerIds: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["code", "message"],
            },
          },
        },
        required: ["isValid", "errors"],
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
          },
          "400": { description: "Token manquant." },
          "403": { description: "Email non vérifié." },
        },
      },
      delete: {
        tags: ["Session"],
        summary: "Destruction de la session",
        description: "Supprime le cookie `__session` côté serveur.",
        responses: {
          "200": { description: "Session supprimée." },
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
        tags: ["Admin", "Sync"],
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
        tags: ["Admin", "Sync"],
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
        tags: ["Admin", "Sync"],
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
        tags: ["Admin", "Sync"],
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
    "/api/brulage/validate": {
      post: {
        tags: ["Brulage", "Compositions"],
        summary: "Validation d'une composition d'équipe",
        description:
          "Valide une composition (brûlage, nombre de joueurs, règles FFTT, règles locales). Utilisée par la page de compositions.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  composition: { type: "object", description: "Structure de composition interne." },
                  teamNumber: { type: "integer" },
                  journee: { type: "integer" },
                  phase: { type: "string" },
                },
                required: ["composition", "teamNumber", "journee", "phase"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Résultat de la validation.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompositionValidation" },
              },
            },
          },
          "400": { description: "Paramètres manquants ou invalides." },
          "403": { description: "Accès refusé (non ADMIN ou COACH)." },
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
        responses: {
          "200": { description: "Liste des équipes." },
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
          "200": { description: "Liste des matchs par équipe." },
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
          "200": { description: "Liste des matchs pour l'équipe." },
          "400": { description: "Paramètre teamId manquant." },
          "500": { description: "Erreur lors de la récupération des matchs." },
        },
      },
    },
  },
} as const;


