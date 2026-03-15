import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  badRequestResponse,
  serverErrorResponse,
  buildPaginationParams,
} from "@/lib/api-utils";
import { z } from "zod";

const objectSchema = z.object({
  apiName: z
    .string()
    .min(1, "API名は必須です")
    .regex(/^[A-Za-z][A-Za-z0-9_]*__c$/, "API名は英字で始まり、__cで終わる必要があります"),
  label: z.string().min(1, "表示ラベルは必須です"),
  pluralLabel: z.string().min(1, "複数形ラベルは必須です"),
  description: z.string().optional(),
  iconName: z.string().optional(),
});

// GET /api/objects - カスタムオブジェクト一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);
    const includeStandard = searchParams.get("includeStandard") === "true";

    const where = includeStandard ? {} : { isCustom: true };

    const [objects, total] = await Promise.all([
      prisma.objectDefinition.findMany({
        where,
        include: {
          _count: {
            select: { fields: true, records: true },
          },
        },
        orderBy: { label: "asc" },
        skip,
        take: limit,
      }),
      prisma.objectDefinition.count({ where }),
    ]);

    return NextResponse.json({
      data: objects,
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

// POST /api/objects - カスタムオブジェクト作成
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const validationResult = objectSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const data = validationResult.data;

    // API名の重複チェック
    const existingObject = await prisma.objectDefinition.findUnique({
      where: { apiName: data.apiName },
    });

    if (existingObject) {
      return badRequestResponse("このAPI名は既に使用されています");
    }

    // カスタムオブジェクトを作成
    const object = await prisma.objectDefinition.create({
      data: {
        ...data,
        isCustom: true,
        isActive: true,
      },
    });

    // デフォルトフィールド（Name）を作成
    await prisma.fieldDefinition.create({
      data: {
        objectId: object.id,
        apiName: "Name",
        label: "名前",
        dataType: "Text",
        isRequired: true,
        length: 255,
        sortOrder: 0,
      },
    });

    return NextResponse.json(object, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
