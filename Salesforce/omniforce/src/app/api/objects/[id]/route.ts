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

const objectUpdateSchema = z.object({
  label: z.string().min(1, "表示ラベルは必須です").optional(),
  pluralLabel: z.string().min(1, "複数形ラベルは必須です").optional(),
  description: z.string().optional(),
  iconName: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/objects/[id] - カスタムオブジェクト詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const object = await prisma.objectDefinition.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    if (!object) {
      return notFoundResponse("オブジェクト");
    }

    return NextResponse.json(object);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/objects/[id] - カスタムオブジェクト更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = objectUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingObject = await prisma.objectDefinition.findUnique({
      where: { id },
    });

    if (!existingObject) {
      return notFoundResponse("オブジェクト");
    }

    const object = await prisma.objectDefinition.update({
      where: { id },
      data: validationResult.data,
    });

    return NextResponse.json(object);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/objects/[id] - カスタムオブジェクト削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const existingObject = await prisma.objectDefinition.findUnique({
      where: { id },
      include: { _count: { select: { records: true } } },
    });

    if (!existingObject) {
      return notFoundResponse("オブジェクト");
    }

    if (!existingObject.isCustom) {
      return badRequestResponse("標準オブジェクトは削除できません");
    }

    // 関連するレコードとフィールドも削除（Cascade設定済み）
    await prisma.objectDefinition.delete({ where: { id } });

    return NextResponse.json({ message: "オブジェクトを削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
