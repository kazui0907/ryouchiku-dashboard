import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      profileId?: string | null;
      roleId?: string | null;
      profileName?: string | null;
      roleName?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    profileId?: string | null;
    roleId?: string | null;
    profileName?: string | null;
    roleName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    profileId?: string | null;
    roleId?: string | null;
    profileName?: string | null;
    roleName?: string | null;
  }
}
