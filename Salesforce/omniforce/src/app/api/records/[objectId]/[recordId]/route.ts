import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/api-utils";

// GET /api/records/[objectId]/[recordId] - カスタムレコード詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string; recordId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { objectId, recordId } = await params;

    const record = await prisma.customRecord.findFirst({
      where: {
        id: recordId,
        objectId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        object: {
          include: {
            fields: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!record) {
      return notFoundResponse("レコード");
    }

    return NextResponse.json(record);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/records/[objectId]/[recordId] - カスタムレコード更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string; recordId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { objectId, recordId } = await params;
    const body = await request.json();

    // レコードの存在確認
    const existingRecord = await prisma.customRecord.findFirst({
      where: {
        id: recordId,
        objectId,
      },
    });

    if (!existingRecord) {
      return notFoundResponse("レコード");
    }

    // オブジェクト定義を取得
    const object = await prisma.objectDefinition.findUnique({
      where: { id: objectId },
      include: { fields: true },
    });

    if (!object) {
      return notFoundResponse("オブジェクト");
    }

    // 必須フィールドのバリデーション
    const requiredFields = object.fields.filter((f) => f.isRequired);
    for (const field of requiredFields) {
      const value = body[field.apiName];
      if (value === undefined || value === null || value === "") {
        return badRequestResponse(`${field.label}は必須です`);
      }
    }

    // Nameフィールドの値を取得
    const name = body.Name || body.name;
    if (!name) {
      return badRequestResponse("名前は必須です");
    }

    // データを整形（Name以外をdataに格納）
    const { Name, name: _, ...restData } = body;

    const record = await prisma.customRecord.update({
      where: { id: recordId },
      data: {
        name,
        data: restData,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/records/[objectId]/[recordId] - カスタムレコード削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string; recordId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { objectId, recordId } = await params;

    const existingRecord = await prisma.customRecord.findFirst({
      where: {
        id: recordId,
        objectId,
      },
    });

    if (!existingRecord) {
      return notFoundResponse("レコード");
    }

    await prisma.customRecord.delete({ where: { id: recordId } });

    return NextResponse.json({ message: "レコードを削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
