import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  buildPaginationParams,
} from "@/lib/api-utils";
import { z } from "zod";

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "is_null", "is_not_null"]),
  value: z.any().optional(),
});

const actionSchema = z.object({
  type: z.enum(["update_field", "create_task", "send_email", "send_notification"]),
  config: z.record(z.string(), z.any()),
});

const ruleSchema = z.object({
  name: z.string().min(1, "ルール名は必須です"),
  description: z.string().optional(),
  objectId: z.string().min(1, "オブジェクトIDは必須です"),
  triggerType: z.enum(["on_create", "on_update", "on_create_or_update", "on_delete"]),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1, "少なくとも1つのアクションが必要です"),
  isActive: z.boolean().default(true),
});

// GET /api/automation/rules - 自動化ルール一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);
    const objectId = searchParams.get("objectId");

    const where: any = {};
    if (objectId) {
      where.objectId = objectId;
    }

    const [rules, total] = await Promise.all([
      prisma.automationRule.findMany({
        where,
        include: {
          object: { select: { id: true, apiName: true, label: true } },
          actions: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.automationRule.count({ where }),
    ]);

    return NextResponse.json({
      data: rules,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/automation/rules - 自動化ルール作成
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const validationResult = ruleSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const data = validationResult.data;

    // オブジェクトの存在確認
    const objectExists = await prisma.objectDefinition.findUnique({
      where: { id: data.objectId },
    });

    if (!objectExists) {
      return notFoundResponse("オブジェクト");
    }

    // ルールとアクションを作成
    const rule = await prisma.automationRule.create({
      data: {
        name: data.name,
        description: data.description,
        objectId: data.objectId,
        triggerType: data.triggerType,
        conditions: data.conditions || [],
        isActive: data.isActive,
        actions: {
          create: data.actions.map((action, index) => ({
            actionType: action.type,
            actionConfig: action.config,
            sortOrder: index,
          })),
        },
      },
      include: {
        object: { select: { id: true, apiName: true, label: true } },
        actions: true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
