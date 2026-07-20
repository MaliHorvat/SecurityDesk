import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { getDb } from "@securitydesk/database";
import { getAppUrl, getPublicAppName, getTrustedOrigins } from "@/lib/app";
import { sendMail } from "@/lib/mail";

function createAuth() {
  const { db, schema, provider } = getDb();

  const isProduction = process.env.NODE_ENV === "production";

  return betterAuth({
    appName: getPublicAppName(),
    baseURL: getAppUrl(),
    trustedOrigins: (request) => {
      const origins = new Set(getTrustedOrigins());
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      if (host) {
        origins.add(`https://${host}`);
        if (!isProduction) {
          origins.add(`http://${host}`);
        }
      }
      return [...origins];
    },
    secret: process.env.AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: provider === "postgresql" ? "pg" : "mysql",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: `${getPublicAppName()} – ponastavitev gesla`,
          text: `Pozdravljeni ${user.name},\n\nZa ponastavitev gesla odprite povezavo:\n${url}\n\nČe tega niste zahtevali, sporočilo prezrite.`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: `${getPublicAppName()} – potrditev e-pošte`,
          text: `Pozdravljeni ${user.name},\n\nPotrdite e-pošto:\n${url}`,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
    advanced: {
      useSecureCookies: isProduction,
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        // Better Auth default role name; mapped to organization_owner in app session layer.
        creatorRole: "owner",
        membershipLimit: 100,
        invitationExpiresIn: 60 * 60 * 48,
        sendInvitationEmail: async (data) => {
          const inviteUrl = `${getAppUrl()}/accept-invitation/${data.id}`;
          await sendMail({
            to: data.email,
            subject: `${getPublicAppName()} – povabilo v organizacijo`,
            text: `Povabljeni ste v organizacijo ${data.organization.name}.\n\nSprejmite povabilo: ${inviteUrl}`,
          });
        },
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!authInstance) {
    if (!process.env.AUTH_SECRET) {
      throw new Error("Manjka AUTH_SECRET. Zaženite pnpm setup.");
    }
    authInstance = createAuth();
  }
  return authInstance;
}

export type Session = typeof authInstance extends null
  ? never
  : Awaited<ReturnType<NonNullable<typeof authInstance>["api"]["getSession"]>>;
