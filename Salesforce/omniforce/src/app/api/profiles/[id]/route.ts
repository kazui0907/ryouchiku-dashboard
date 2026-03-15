import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-utils";
import { z } from "zod";

const profileUpdateSchema = z.object({
  name: z.string().min(1, "プロファイル名は必須です").optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/profiles/[id] - プロファイル詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        objectPermissions: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!profile) {
      return notFoundResponse("プロファイル");
    }

    return NextResponse.json(profile);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/profiles/[id] - プロファイル更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      return notFoundResponse("プロファイル");
    }

    // システムプロファイルは名前変更不可
    if (existingProfile.isSystem && validationResult.data.name) {
      return badRequestResponse("システムプロファイルの名前は変更できません");
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: validationResult.data,
    });

    return NextResponse.json(profile);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/profiles/[id] - プロファイル削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const existingProfile = await prisma.profile.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!existingProfile) {
      return notFoundResponse("プロファイル");
    }

    if (existingProfile.isSystem) {
      return badRequestResponse("システムプロファイルは削除できません");
    }

    if (existingProfile._count.users > 0) {
      return badRequestResponse("ユーザーが割り当てられているプロファイルは削除できません");
    }

    await prisma.profile.delete({ where: { id } });

    return NextResponse.json({ message: "プロファイルを削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
