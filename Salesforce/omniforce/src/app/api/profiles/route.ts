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

const profileSchema = z.object({
  name: z.string().min(1, "プロファイル名は必須です"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// GET /api/profiles - プロファイル一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.profile.count(),
    ]);

    return NextResponse.json({
      data: profiles,
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

// POST /api/profiles - プロファイル作成
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const validationResult = profileSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const data = validationResult.data;

    // 名前の重複チェック
    const existingProfile = await prisma.profile.findUnique({
      where: { name: data.name },
    });

    if (existingProfile) {
      return badRequestResponse("このプロファイル名は既に使用されています");
    }

    const profile = await prisma.profile.create({
      data,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
