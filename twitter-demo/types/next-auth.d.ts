import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      // standard fields
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
  }
}

declare module "next-auth/jwt" {
  interface JWT {
  }
}
