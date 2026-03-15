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

const fieldUpdateSchema = z.object({
  label: z.string().min(1, "表示ラベルは必須です").optional(),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  defaultValue: z.string().optional(),
  length: z.number().optional(),
  precision: z.number().optional(),
  scale: z.number().optional(),
  picklistValues: z.array(z.object({
    value: z.string(),
    label: z.string(),
    isDefault: z.boolean().optional(),
  })).optional(),
  referenceObjectId: z.string().optional(),
  description: z.string().optional(),
  helpText: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/objects/[id]/fields/[fieldId] - フィールド詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, fieldId } = await params;

    const field = await prisma.fieldDefinition.findFirst({
      where: {
        id: fieldId,
        objectId: id,
      },
      include: {
        referenceObject: {
          select: { id: true, apiName: true, label: true },
        },
      },
    });

    if (!field) {
      return notFoundResponse("フィールド");
    }

    return NextResponse.json(field);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/objects/[id]/fields/[fieldId] - フィールド更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, fieldId } = await params;
    const body = await request.json();
    const validationResult = fieldUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingField = await prisma.fieldDefinition.findFirst({
      where: {
        id: fieldId,
        objectId: id,
      },
    });

    if (!existingField) {
      return notFoundResponse("フィールド");
    }

    // Nameフィールドは特定の属性のみ変更可能
    if (existingField.apiName === "Name") {
      const { label, description, helpText } = validationResult.data;
      const field = await prisma.fieldDefinition.update({
        where: { id: fieldId },
        data: { label, description, helpText },
      });
      return NextResponse.json(field);
    }

    const field = await prisma.fieldDefinition.update({
      where: { id: fieldId },
      data: validationResult.data,
    });

    return NextResponse.json(field);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/objects/[id]/fields/[fieldId] - フィールド削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, fieldId } = await params;

    const existingField = await prisma.fieldDefinition.findFirst({
      where: {
        id: fieldId,
        objectId: id,
      },
    });

    if (!existingField) {
      return notFoundResponse("フィールド");
    }

    // Nameフィールドは削除不可
    if (existingField.apiName === "Name") {
      return badRequestResponse("名前フィールドは削除できません");
    }

    await prisma.fieldDefinition.delete({ where: { id: fieldId } });

    return NextResponse.json({ message: "フィールドを削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
