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
import { OPPORTUNITY_STAGES } from "../route";

const opportunityUpdateSchema = z.object({
  name: z.string().min(1, "商談名は必須です").optional(),
  amount: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  stage: z.string().optional(),
  type: z.string().optional(),
  leadSource: z.string().optional(),
  closeDate: z.string().optional(),
  description: z.string().optional(),
  nextStep: z.string().optional(),
  accountId: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// GET /api/opportunities/[id] - 商談詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                title: true,
              },
            },
          },
        },
        activities: {
          orderBy: { activityDate: "desc" },
          take: 10,
        },
      },
    });

    if (!opportunity) {
      return notFoundResponse("商談");
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/opportunities/[id] - 商談更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = opportunityUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingOpportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!existingOpportunity) {
      return notFoundResponse("商談");
    }

    const { closeDate, stage, ...restData } = validationResult.data;

    // ステージが変更された場合、isClosed/isWonを更新
    let isClosed = existingOpportunity.isClosed;
    let isWon = existingOpportunity.isWon;
    if (stage) {
      const stageInfo = OPPORTUNITY_STAGES.find(s => s.value === stage);
      isClosed = stageInfo?.isClosed || false;
      isWon = stageInfo?.isWon || false;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        ...restData,
        stage,
        isClosed,
        isWon,
        closeDate: closeDate ? new Date(closeDate) : undefined,
        updatedById: user.id,
      },
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(opportunity);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/opportunities/[id] - 商談削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const existingOpportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!existingOpportunity) {
      return notFoundResponse("商談");
    }

    await prisma.opportunity.delete({ where: { id } });

    return NextResponse.json({ message: "商談を削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
