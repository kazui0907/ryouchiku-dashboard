import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  buildPaginationParams,
  buildSortParams,
} from "@/lib/api-utils";

// GET /api/records/[objectId] - カスタムレコード一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { objectId } = await params;
    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);
    const { sortBy, sortOrder } = buildSortParams(searchParams);
    const search = searchParams.get("search") || "";

    // オブジェクト定義を取得
    const object = await prisma.objectDefinition.findUnique({
      where: { id: objectId },
      include: { fields: true },
    });

    if (!object) {
      return notFoundResponse("オブジェクト");
    }

    const where: any = { objectId };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const orderBy = sortBy === "createdAt" || sortBy === "updatedAt" || sortBy === "name"
      ? { [sortBy]: sortOrder }
      : { createdAt: sortOrder };

    const [records, total] = await Promise.all([
      prisma.customRecord.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.customRecord.count({ where }),
    ]);

    return NextResponse.json({
      data: records,
      object,
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

// POST /api/records/[objectId] - カスタムレコード作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { objectId } = await params;
    const body = await request.json();

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

    const record = await prisma.customRecord.create({
      data: {
        objectId,
        name,
        data: restData,
        ownerId: user.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
