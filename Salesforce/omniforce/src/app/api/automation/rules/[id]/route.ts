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

const ruleUpdateSchema = z.object({
  name: z.string().min(1, "ルール名は必須です").optional(),
  description: z.string().optional(),
  triggerType: z.enum(["on_create", "on_update", "on_create_or_update", "on_delete"]).optional(),
  conditions: z.any().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/automation/rules/[id] - 自動化ルール詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const rule = await prisma.automationRule.findUnique({
      where: { id },
      include: {
        object: { select: { id: true, apiName: true, label: true } },
        actions: true,
      },
    });

    if (!rule) {
      return notFoundResponse("自動化ルール");
    }

    return NextResponse.json(rule);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/automation/rules/[id] - 自動化ルール更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = ruleUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingRule = await prisma.automationRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return notFoundResponse("自動化ルール");
    }

    const rule = await prisma.automationRule.update({
      where: { id },
      data: validationResult.data,
      include: {
        object: { select: { id: true, apiName: true, label: true } },
        actions: true,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/automation/rules/[id] - 自動化ルール削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const existingRule = await prisma.automationRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return notFoundResponse("自動化ルール");
    }

    await prisma.automationRule.delete({ where: { id } });

    return NextResponse.json({ message: "自動化ルールを削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
