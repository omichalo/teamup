/**
 * Traduit les codes d'erreur Firebase en messages clairs en français
 */
export function getFirebaseErrorMessage(error: unknown): string {
  if (!error) {
    return "Une erreur inconnue s'est produite";
  }

  // Si c'est déjà une string, la retourner
  if (typeof error === "string") {
    return error;
  }

  // Si c'est un objet Error avec un code Firebase
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    const message = error.message;

    if (code) {
      return translateFirebaseErrorCode(code, message);
    }

    // Si pas de code mais un message, vérifier s'il contient des codes Firebase
    if (message) {
      const codeMatch = message.match(/auth\/([a-z-]+)/i);
      if (codeMatch) {
        return translateFirebaseErrorCode(`auth/${codeMatch[1]}`, message);
      }
    }

    return message || "Une erreur inconnue s'est produite";
  }

  // Si c'est un objet avec code et/ou message
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: string }).code;
    const message = (error as { message?: string }).message;

    if (code) {
      return translateFirebaseErrorCode(code, message);
    }

    if (message) {
      return message;
    }
  }

  return "Une erreur inconnue s'est produite";
}

/**
 * Traduit un code d'erreur Firebase spécifique
 */
function translateFirebaseErrorCode(code: string, originalMessage?: string): string {
  const errorMessages: Record<string, string> = {
    // Erreurs d'authentification
    "auth/invalid-credential":
      "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.",
    "auth/user-not-found":
      "Aucun compte n'est associé à cet email. Vérifiez votre adresse email ou créez un compte.",
    "auth/wrong-password": "Mot de passe incorrect. Vérifiez votre mot de passe et réessayez.",
    "auth/email-already-in-use":
      "Cet email est déjà utilisé par un autre compte. Utilisez un autre email ou connectez-vous.",
    "auth/weak-password":
      "Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.",
    "auth/invalid-email": "L'adresse email n'est pas valide. Vérifiez le format de votre email.",
    "auth/too-many-requests":
      "Trop de tentatives échouées. Veuillez réessayer plus tard ou réinitialiser votre mot de passe.",
    "auth/network-request-failed":
      "Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.",
    "auth/api-key-not-valid":
      "Erreur de configuration. Veuillez contacter l'administrateur du site.",
    "auth/operation-not-allowed":
      "Cette opération n'est pas autorisée. Veuillez contacter l'administrateur.",
    "auth/user-disabled":
      "Ce compte a été désactivé. Veuillez contacter l'administrateur pour plus d'informations.",
    "auth/requires-recent-login":
      "Cette opération nécessite une connexion récente. Veuillez vous reconnecter et réessayer.",
    "auth/invalid-action-code":
      "Le lien est invalide ou a déjà été utilisé. Veuillez demander un nouveau lien.",
    "auth/expired-action-code":
      "Le lien a expiré. Veuillez demander un nouveau lien de vérification ou de réinitialisation.",
    "auth/invalid-verification-code":
      "Le code de vérification est invalide. Vérifiez le code et réessayez.",
    "auth/invalid-verification-id":
      "L'identifiant de vérification est invalide. Veuillez réessayer.",
    "auth/missing-email":
      "L'adresse email est requise. Veuillez fournir une adresse email valide.",
    "auth/missing-password":
      "Le mot de passe est requis. Veuillez fournir un mot de passe.",
    "auth/quota-exceeded":
      "Le quota de requêtes a été dépassé. Veuillez réessayer plus tard.",
    "auth/popup-closed-by-user":
      "La fenêtre de connexion a été fermée. Veuillez réessayer.",
    "auth/cancelled-popup-request":
      "Une autre fenêtre de connexion est déjà ouverte. Fermez-la et réessayez.",
    "auth/popup-blocked":
      "La fenêtre de connexion a été bloquée par votre navigateur. Autorisez les popups et réessayez.",
    "auth/account-exists-with-different-credential":
      "Un compte existe déjà avec le même email mais avec un autre moyen de connexion. Connectez-vous avec le moyen de connexion original.",
    "auth/credential-already-in-use":
      "Ces identifiants sont déjà utilisés par un autre compte.",
    "auth/invalid-phone-number":
      "Le numéro de téléphone n'est pas valide. Vérifiez le format du numéro.",
    "auth/missing-phone-number":
      "Le numéro de téléphone est requis. Veuillez fournir un numéro de téléphone valide.",
    "auth/session-cookie-expired":
      "Votre session a expiré. Veuillez vous reconnecter.",
    "auth/session-cookie-revoked":
      "Votre session a été révoquée. Veuillez vous reconnecter.",
  };

  // Chercher le message traduit
  const translatedMessage = errorMessages[code.toLowerCase()];

  if (translatedMessage) {
    return translatedMessage;
  }

  // Si pas de traduction trouvée, utiliser le message original ou un message générique
  if (originalMessage && !originalMessage.includes("Firebase:")) {
    return originalMessage;
  }

  // Message générique basé sur le code
  if (code.startsWith("auth/")) {
    return `Erreur d'authentification : ${code.replace("auth/", "")}. Veuillez réessayer ou contacter l'administrateur si le problème persiste.`;
  }

  return originalMessage || "Une erreur inconnue s'est produite";
}

