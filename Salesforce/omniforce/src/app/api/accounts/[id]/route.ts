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

const accountUpdateSchema = z.object({
  name: z.string().min(1, "取引先名は必須です").optional(),
  industry: z.string().optional(),
  type: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  billingStreet: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPostalCode: z.string().optional(),
  billingCountry: z.string().optional(),
  shippingStreet: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPostalCode: z.string().optional(),
  shippingCountry: z.string().optional(),
  annualRevenue: z.number().optional(),
  numberOfEmployees: z.number().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// GET /api/accounts/[id] - 取引先詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
          },
          take: 10,
        },
        opportunities: {
          select: {
            id: true,
            name: true,
            amount: true,
            stage: true,
            closeDate: true,
          },
          take: 10,
        },
        cases: {
          select: {
            id: true,
            caseNumber: true,
            subject: true,
            status: true,
            priority: true,
          },
          take: 10,
        },
        activities: {
          orderBy: { activityDate: "desc" },
          take: 10,
        },
      },
    });

    if (!account) {
      return notFoundResponse("取引先");
    }

    return NextResponse.json(account);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/accounts/[id] - 取引先更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = accountUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      return notFoundResponse("取引先");
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...validationResult.data,
        updatedById: user.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/accounts/[id] - 取引先削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      return notFoundResponse("取引先");
    }

    await prisma.account.delete({ where: { id } });

    return NextResponse.json({ message: "取引先を削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
