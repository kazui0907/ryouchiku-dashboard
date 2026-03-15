import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            profile: true,
            role: true,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          profileId: user.profileId,
          roleId: user.roleId,
          profileName: user.profile?.name,
          roleName: user.role?.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.profileId = (user as any).profileId;
        token.roleId = (user as any).roleId;
        token.profileName = (user as any).profileName;
        token.roleName = (user as any).roleName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).profileId = token.profileId;
        (session.user as any).roleId = token.roleId;
        (session.user as any).profileName = token.profileName;
        (session.user as any).roleName = token.roleName;
      }
      return session;
    },
  },
});

// ユーザー作成用のヘルパー関数
export async function createUser(
  email: string,
  password: string,
  name?: string,
  profileId?: string,
  roleId?: string
) {
  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      profileId,
      roleId,
    },
  });
}
