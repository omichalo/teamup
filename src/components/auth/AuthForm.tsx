"use client";

import { FormEvent, ReactNode, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase.client";
import {
  emailSchema,
  loginSchema,
  signupSchema,
} from "@/lib/validators";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { validateInternalRedirect } from "@/lib/auth/redirect-utils";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { EmailField } from "./fields/EmailField";
import { PasswordField } from "./fields/PasswordField";
import { usePostSignupVerificationPolling } from "./usePostSignupVerificationPolling";
import { requestVerificationEmail } from "./request-verification-email";

export type AuthMode = "login" | "signup" | "forgot-password";

type CommonProps = {
  /** Mode courant du formulaire. */
  mode: AuthMode;
  /**
   * Callback de bascule de mode. Si fourni, l'AuthForm appelle cette fonction
   * (utile dans un Dialog où l'on reste sur la même URL). Si absent, le lien
   * de bascule devient un `<Link>` Next.js vers la page correspondante.
   */
  onModeChange?: (m: AuthMode) => void;
  /**
   * Callback de succès final, appelé après que la session soit établie.
   *
   * - En `login` : appelé après `POST /api/session` (cookie posé).
   * - En `signup` : appelé après que l'email soit vérifié et que la session
   *   soit créée par le polling automatique. En `embedded`, le composant
   *   parent enchaîne ; sinon une redirection vers `next` est tentée.
   * - En `forgot-password` : non applicable.
   */
  onSuccess?: () => void | Promise<void>;
  /**
   * URL de redirection par défaut après un login réussi (mode page).
   * Validée par `validateInternalRedirect`.
   */
  next?: string;
  /** Pré-remplit l'email (utile si on remonte d'une autre étape). */
  initialEmail?: string;
  /**
   * Mode "intégré" (Dialog ou autre conteneur) : aucun lien externe, aucune
   * redirection navigateur ; on délègue tout à `onSuccess`.
   */
  embedded?: boolean;
  /**
   * Contenu libre injecté en tête de chaque mode (ex. bandeau de transparence
   * sur l'usage de l'e-mail dans le parcours d'inscription club).
   */
  headerSlot?: ReactNode;
};

export function AuthForm(props: CommonProps) {
  switch (props.mode) {
    case "login":
      return <LoginPanel {...props} />;
    case "signup":
      return <SignupPanel {...props} />;
    case "forgot-password":
      return <ForgotPasswordPanel {...props} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* LoginPanel                                                          */
/* ------------------------------------------------------------------ */

function LoginPanel({
  onModeChange,
  onSuccess,
  next,
  initialEmail,
  embedded,
  headerSlot,
}: CommonProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      setLoading(false);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(clientAuth, email, password);
      if (!cred.user.emailVerified) {
        const verification = await requestVerificationEmail(email);
        if (verification.ok) {
          setErr(
            "Email non vérifié. Un nouveau lien de vérification vient d'être envoyé à votre adresse. Vérifiez votre boîte de réception (et vos spams)."
          );
        } else {
          setErr(
            `Email non vérifié. ${verification.error} Vous pouvez réessayer via la page de renvoi.`
          );
        }
        setLoading(false);
        return;
      }

      await postSession(cred.user);

      if (onSuccess) {
        await onSuccess();
        return;
      }

      if (!embedded) {
        const target = validateInternalRedirect(next ?? null);
        window.location.href = target;
      }
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {headerSlot ? <Box sx={{ mb: 2 }}>{headerSlot}</Box> : null}

      {err ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {err}
        </Alert>
      ) : null}

      <EmailField name="email" defaultValue={initialEmail ?? ""} />
      <PasswordField name="password" autoComplete="current-password" />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Se connecter"}
      </Button>

      <Stack spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <ModeSwitch
          target="signup"
          label="Pas de compte ? Créer un compte"
          onModeChange={onModeChange}
          embedded={embedded}
        />
        <ModeSwitch
          target="forgot-password"
          label="Mot de passe oublié ?"
          onModeChange={onModeChange}
          embedded={embedded}
        />
        {embedded ? null : (
          <MuiLink
            component={NextLink}
            href="/resend-verification"
            underline="hover"
          >
            Renvoyer l’email de vérification
          </MuiLink>
        )}
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* SignupPanel                                                         */
/* ------------------------------------------------------------------ */

function SignupPanel({
  onModeChange,
  onSuccess,
  next,
  initialEmail,
  embedded,
  headerSlot,
}: CommonProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  const polling = usePostSignupVerificationPolling({
    enabled: signupCompleted && !pollingTimedOut,
    onVerified: async () => {
      const u = clientAuth.currentUser;
      if (!u) return;
      try {
        await postSession(u);
        if (onSuccess) {
          await onSuccess();
          return;
        }
        if (!embedded) {
          const target = validateInternalRedirect(next ?? null);
          window.location.href = target;
        }
      } catch (e: unknown) {
        setErr(getFirebaseErrorMessage(e));
      }
    },
  });

  /* Bascule en `timeout` : on l'expose au parent pour rendre un état explicite. */
  if (polling.status === "timeout" && !pollingTimedOut) {
    setPollingTimedOut(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");

    const parsed = signupSchema.safeParse({
      email,
      password,
      confirm: confirmPassword,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      setLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(clientAuth, email, password);
      const verification = await requestVerificationEmail(email);
      if (verification.ok) {
        setInfo(
          "Compte créé. Un email de vérification vient de vous être envoyé. Cliquez sur le lien dans votre boîte de réception (et vos spams) — vous serez automatiquement reconnecté(e) ici."
        );
      } else {
        setInfo(
          `Compte créé. Cependant l'envoi de l'email de vérification a échoué (${verification.error}). Vous pouvez en demander un nouveau via la page de renvoi.`
        );
      }
      setSignupCompleted(true);
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (signupCompleted) {
    return (
      <Stack spacing={2}>
        {headerSlot ? <Box>{headerSlot}</Box> : null}
        {info ? <Alert severity="success">{info}</Alert> : null}
        {err ? <Alert severity="error">{err}</Alert> : null}
        <PollingStatus
          status={polling.status}
          lastCheckedAt={polling.lastCheckedAt}
          onRetry={() => {
            setPollingTimedOut(false);
            setErr(null);
          }}
        />
        <ModeSwitch
          target="login"
          label="Déjà vérifié ? Se connecter"
          onModeChange={onModeChange}
          embedded={embedded}
        />
      </Stack>
    );
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {headerSlot ? <Box sx={{ mb: 2 }}>{headerSlot}</Box> : null}

      {err ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {err}
        </Alert>
      ) : null}

      <EmailField name="email" defaultValue={initialEmail ?? ""} />

      <PasswordField
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {password ? <PasswordRequirements password={password} /> : null}

      <PasswordField
        label="Confirmer le mot de passe"
        name="confirm"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={confirmPassword !== "" && password !== confirmPassword}
        helperText={
          confirmPassword !== "" && password !== confirmPassword
            ? "Les mots de passe ne correspondent pas"
            : undefined
        }
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Créer mon compte"}
      </Button>

      <Stack spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <ModeSwitch
          target="login"
          label="Déjà inscrit(e) ? Se connecter"
          onModeChange={onModeChange}
          embedded={embedded}
        />
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* ForgotPasswordPanel                                                 */
/* ------------------------------------------------------------------ */

function ForgotPasswordPanel({
  onModeChange,
  initialEmail,
  embedded,
  headerSlot,
}: CommonProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErr(parsed.error.issues.map((er) => er.message).join(" • "));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Échec d'envoi de l'email de réinitialisation");
      }
      setInfo(
        "Email de réinitialisation envoyé. Vérifiez votre boîte de réception (et vos spams)."
      );
    } catch (e: unknown) {
      setErr(getFirebaseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {headerSlot ? <Box sx={{ mb: 2 }}>{headerSlot}</Box> : null}
      {info ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          {info}
        </Alert>
      ) : null}
      {err ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {err}
        </Alert>
      ) : null}

      <EmailField
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Envoyer le lien"}
      </Button>

      <Stack spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <ModeSwitch
          target="login"
          label="Retour à la connexion"
          onModeChange={onModeChange}
          embedded={embedded}
        />
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const MODE_HREF: Record<AuthMode, string> = {
  login: "/login",
  signup: "/signup",
  "forgot-password": "/reset",
};

function ModeSwitch({
  target,
  label,
  onModeChange,
  embedded,
}: {
  target: AuthMode;
  label: string;
  onModeChange: ((m: AuthMode) => void) | undefined;
  embedded: boolean | undefined;
}) {
  if (onModeChange) {
    return (
      <MuiLink
        component="button"
        type="button"
        underline="hover"
        onClick={() => onModeChange(target)}
      >
        {label}
      </MuiLink>
    );
  }
  if (embedded) {
    return (
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    );
  }
  return (
    <MuiLink
      component={NextLink}
      href={MODE_HREF[target]}
      underline="hover"
    >
      {label}
    </MuiLink>
  );
}

function PollingStatus({
  status,
  lastCheckedAt,
  onRetry,
}: {
  status: "idle" | "polling" | "verified" | "timeout" | "error";
  lastCheckedAt: number | null;
  onRetry: () => void;
}) {
  if (status === "verified") {
    return <Alert severity="success">Email vérifié — connexion en cours…</Alert>;
  }
  if (status === "timeout") {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Réessayer
          </Button>
        }
      >
        Le contrôle automatique est suspendu. Si vous venez de cliquer sur le lien
        de vérification, réessayez. Sinon, vérifiez votre boîte de réception et vos
        spams.
      </Alert>
    );
  }
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ color: "text.secondary" }}
    >
      <CircularProgress size={16} />
      <Typography variant="caption">
        En attente de la confirmation de votre email
        {lastCheckedAt
          ? ` (dernier contrôle ${formatTimeOfDay(lastCheckedAt)})`
          : null}
        …
      </Typography>
    </Stack>
  );
}

function formatTimeOfDay(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleTimeString();
}

async function postSession(user: import("firebase/auth").User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Échec de création de session");
  }
}
