import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";

export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
}

export function notFoundResponse(resource: string) {
  return NextResponse.json({ error: `${resource}が見つかりません` }, { status: 404 });
}

export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverErrorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
}

export async function checkObjectPermission(
  userId: string,
  objectApiName: string,
  action: "create" | "read" | "update" | "delete"
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          objectPermissions: {
            where: { objectApiName },
          },
        },
      },
    },
  });

  if (!user?.profile?.objectPermissions?.[0]) {
    return false;
  }

  const permission = user.profile.objectPermissions[0];
  switch (action) {
    case "create":
      return permission.canCreate;
    case "read":
      return permission.canRead;
    case "update":
      return permission.canUpdate;
    case "delete":
      return permission.canDelete;
    default:
      return false;
  }
}

export function buildPaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildSortParams(searchParams: URLSearchParams) {
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
  return { sortBy, sortOrder };
}
