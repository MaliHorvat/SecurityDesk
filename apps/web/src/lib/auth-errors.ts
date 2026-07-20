type AuthClientError = {
  message?: string;
  status?: number;
  statusText?: string;
};

const AUTH_ERROR_SL: Record<string, string> = {
  "Invalid email or password": "Napačna e-pošta ali geslo.",
  "User already exists": "Račun s tem e-poštnim naslovom že obstaja. Prijavite se ali uporabite pozabljeno geslo.",
  "Password too short": "Geslo mora imeti vsaj 8 znakov.",
  "Email already exists": "Račun s tem e-poštnim naslovom že obstaja.",
  "Invalid origin": "Neveljaven izvor zahteve. Preverite APP_URL na strežniku.",
  "Auth storitev trenutno ni na voljo. Preverite /api/health in Vercel env.":
    "Prijava trenutno ni na voljo. Administrator naj preveri nastavitve na Vercelu (/api/health).",
};

/** Map Better Auth client errors to user-friendly Slovenian messages. */
export function formatAuthError(error: AuthClientError | null | undefined, fallback: string): string {
  if (!error) return fallback;

  if (error.status === 0) {
    return "Aplikacija ne odgovarja. Lokalno zaženite `pnpm dev`, na produkciji preverite Vercel deploy in /api/health.";
  }

  if (error.status === 500) {
    return AUTH_ERROR_SL[error.message ?? ""] ??
      "Strežniška napaka pri prijavi. Preverite /api/health na domeni.";
  }

  if (error.message) {
    return AUTH_ERROR_SL[error.message] ?? error.message;
  }

  if (error.statusText) {
    return error.statusText;
  }

  return fallback;
}
