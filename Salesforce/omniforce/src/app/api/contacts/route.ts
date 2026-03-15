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

const contactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().min(1, "姓は必須です"),
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
  accountId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

// GET /api/contacts - 取引先責任者一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);
    const { sortBy, sortOrder } = buildSortParams(searchParams);
    const search = searchParams.get("search") || "";
    const accountId = searchParams.get("accountId");

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (accountId) {
      where.accountId = accountId;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          account: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      data: contacts,
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

// POST /api/contacts - 取引先責任者作成
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const validationResult = contactSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const { birthdate, email, ...restData } = validationResult.data;

    const contact = await prisma.contact.create({
      data: {
        ...restData,
        email: email || null,
        birthdate: birthdate ? new Date(birthdate) : null,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id,
      },
      include: {
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
