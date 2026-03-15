import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  badRequestResponse,
  serverErrorResponse,
  buildPaginationParams,
  buildSortParams,
} from "@/lib/api-utils";
import { z } from "zod";

const opportunitySchema = z.object({
  name: z.string().min(1, "商談名は必須です"),
  amount: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  stage: z.string().default("Prospecting"),
  type: z.string().optional(),
  leadSource: z.string().optional(),
  closeDate: z.string().min(1, "完了予定日は必須です"),
  description: z.string().optional(),
  nextStep: z.string().optional(),
  accountId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// 商談ステージの定義
export const OPPORTUNITY_STAGES = [
  { value: "Prospecting", label: "見込み調査", probability: 10 },
  { value: "Qualification", label: "評価", probability: 20 },
  { value: "Needs Analysis", label: "ニーズ分析", probability: 30 },
  { value: "Value Proposition", label: "提案", probability: 50 },
  { value: "Proposal/Price Quote", label: "見積提示", probability: 70 },
  { value: "Negotiation/Review", label: "交渉/レビュー", probability: 80 },
  { value: "Closed Won", label: "成立", probability: 100, isClosed: true, isWon: true },
  { value: "Closed Lost", label: "不成立", probability: 0, isClosed: true, isWon: false },
];

// GET /api/opportunities - 商談一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);
    const { sortBy, sortOrder } = buildSortParams(searchParams);
    const search = searchParams.get("search") || "";
    const accountId = searchParams.get("accountId");
    const stage = searchParams.get("stage");
    const isClosed = searchParams.get("isClosed");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (stage) {
      where.stage = stage;
    }

    if (isClosed !== null && isClosed !== undefined) {
      where.isClosed = isClosed === "true";
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          account: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.opportunity.count({ where }),
    ]);

    return NextResponse.json({
      data: opportunities,
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

// POST /api/opportunities - 商談作成
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const validationResult = opportunitySchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const { closeDate, ...restData } = validationResult.data;

    // ステージに基づいてisClosed/isWonを設定
    const stageInfo = OPPORTUNITY_STAGES.find(s => s.value === restData.stage);
    const isClosed = stageInfo?.isClosed || false;
    const isWon = stageInfo?.isWon || false;

    const opportunity = await prisma.opportunity.create({
      data: {
        ...restData,
        closeDate: new Date(closeDate),
        isClosed,
        isWon,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id,
      },
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
