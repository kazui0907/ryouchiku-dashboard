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

const accountSchema = z.object({
  name: z.string().min(1, "取引先名は必須です"),
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

// GET /api/accounts - 取引先一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const { limit, skip } = buildPaginationParams(searchParams);
    const { sortBy, sortOrder } = buildSortParams(searchParams);
    const search = searchParams.get("search") || "";

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { website: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { contacts: true, opportunities: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.account.count({ where }),
    ]);

    return NextResponse.json({
      data: accounts,
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

// POST /api/accounts - 取引先作成
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const validationResult = accountSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const data = validationResult.data;

    const account = await prisma.account.create({
      data: {
        ...data,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
