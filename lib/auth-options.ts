import type { NextAuthOptions } from "next-auth";
import { decode, type JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { cookies } from "next/headers";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const MICROSOFT_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "Calendars.ReadWrite",
  "User.Read",
].join(" ");

export type ProviderTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  error?: "RefreshTokenError";
};

async function refreshGoogleToken(tokens: ProviderTokens): Promise<ProviderTokens> {
  try {
    if (!tokens.refreshToken) throw new Error("missing refresh token");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in),
    };
  } catch {
    return { ...tokens, error: "RefreshTokenError" };
  }
}

async function refreshMicrosoftToken(tokens: ProviderTokens): Promise<ProviderTokens> {
  try {
    if (!tokens.refreshToken) throw new Error("missing refresh token");
    const tenant = process.env.AZURE_AD_TENANT_ID ?? "common";
    const res = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: tokens.refreshToken,
          scope: MICROSOFT_SCOPES,
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) throw data;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + Number(data.expires_in),
    };
  } catch {
    return { ...tokens, error: "RefreshTokenError" };
  }
}

async function readPreviousToken(): Promise<JWT | null> {
  try {
    const store = cookies();
    const raw =
      store.get("__Secure-next-auth.session-token")?.value ??
      store.get("next-auth.session-token")?.value;
    if (!raw) return null;
    return await decode({ token: raw, secret: process.env.NEXTAUTH_SECRET! });
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
      authorization: { params: { scope: MICROSOFT_SCOPES } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const previous = await readPreviousToken();
        if (previous?.google && account.provider !== "google") {
          token.google = previous.google;
        }
        if (previous?.microsoft && account.provider !== "azure-ad") {
          token.microsoft = previous.microsoft;
        }

        const incoming: ProviderTokens = {
          accessToken: account.access_token as string,
          refreshToken: account.refresh_token as string | undefined,
          expiresAt: (account.expires_at as number) ?? Math.floor(Date.now() / 1000) + 3600,
        };
        if (account.provider === "google") token.google = incoming;
        else if (account.provider === "azure-ad") token.microsoft = incoming;
        return token;
      }

      const now = Math.floor(Date.now() / 1000);
      if (token.google && token.google.expiresAt - 60 < now && token.google.refreshToken) {
        token.google = await refreshGoogleToken(token.google);
      }
      if (token.microsoft && token.microsoft.expiresAt - 60 < now && token.microsoft.refreshToken) {
        token.microsoft = await refreshMicrosoftToken(token.microsoft);
      }
      return token;
    },
    async session({ session, token }) {
      session.google = token.google;
      session.microsoft = token.microsoft;
      return session;
    },
  },
};
