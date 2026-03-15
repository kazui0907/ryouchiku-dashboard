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

const contactUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().min(1, "姓は必須です").optional(),
  email: z.string().email("有効なメールアドレスを入力してください").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  birthdate: z.string().optional(),
  description: z.string().optional(),
  mailingStreet: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingState: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  mailingCountry: z.string().optional(),
  accountId: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// GET /api/contacts/[id] - 取引先責任者詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        opportunities: {
          include: {
            opportunity: {
              select: {
                id: true,
                name: true,
                amount: true,
                stage: true,
                closeDate: true,
              },
            },
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

    if (!contact) {
      return notFoundResponse("取引先責任者");
    }

    return NextResponse.json(contact);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/contacts/[id] - 取引先責任者更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = contactUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const existingContact = await prisma.contact.findUnique({ where: { id } });
    if (!existingContact) {
      return notFoundResponse("取引先責任者");
    }

    const { birthdate, email, ...restData } = validationResult.data;

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...restData,
        email: email || null,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        updatedById: user.id,
      },
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE /api/contacts/[id] - 取引先責任者削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const existingContact = await prisma.contact.findUnique({ where: { id } });
    if (!existingContact) {
      return notFoundResponse("取引先責任者");
    }

    await prisma.contact.delete({ where: { id } });

    return NextResponse.json({ message: "取引先責任者を削除しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
