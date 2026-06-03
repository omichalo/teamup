export type FFTTConfig = {
  id: string;
  pwd: string;
  clubCode: string;
};

type LegacyFunctionsFfttConfig = {
  id?: string;
  pwd?: string;
  club_code?: string;
};

function readLegacyFunctionsConfig(): Partial<FFTTConfig> {
  try {
    // Disponible uniquement dans le runtime Cloud Functions (firebase-functions).
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optionnel, absent sur App Hosting
    const functions = require("firebase-functions") as {
      config?: () => { fftt?: LegacyFunctionsFfttConfig };
    };
    const fftt = functions.config?.()?.fftt;
    if (!fftt) return {};
    return {
      ...(fftt.id ? { id: String(fftt.id) } : {}),
      ...(fftt.pwd ? { pwd: String(fftt.pwd) } : {}),
      ...(fftt.club_code ? { clubCode: String(fftt.club_code) } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Configuration FFTT partagée App Hosting (process.env) et Cloud Functions
 * (secrets ID_FFTT/PWD_FFTT ou legacy functions.config().fftt.*).
 */
export function getFFTTConfig(): FFTTConfig {
  const legacy = readLegacyFunctionsConfig();
  const id = process.env.ID_FFTT || legacy.id;
  const pwd = process.env.PWD_FFTT || legacy.pwd;
  const clubCode = process.env.CLUB_CODE || legacy.clubCode || "08781477";

  if (!id || !pwd) {
    throw new Error(
      "FFTT credentials (ID_FFTT and PWD_FFTT) are required as environment variables or functions.config().fftt"
    );
  }

  return { id, pwd, clubCode };
}
