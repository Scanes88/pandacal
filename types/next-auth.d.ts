import type { ProviderTokens } from "@/lib/auth-options";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    google?: ProviderTokens;
    microsoft?: ProviderTokens;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    google?: ProviderTokens;
    microsoft?: ProviderTokens;
  }
}
