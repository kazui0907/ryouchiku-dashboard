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

// フィールドデータタイプ
export const FIELD_DATA_TYPES = [
  { value: "Text", label: "テキスト", hasLength: true },
  { value: "TextArea", label: "テキストエリア", hasLength: true },
  { value: "RichText", label: "リッチテキスト", hasLength: false },
  { value: "Number", label: "数値", hasPrecision: true },
  { value: "Currency", label: "通貨", hasPrecision: true },
  { value: "Percent", label: "パーセント", hasPrecision: true },
  { value: "Date", label: "日付", hasLength: false },
  { value: "DateTime", label: "日時", hasLength: false },
  { value: "Checkbox", label: "チェックボックス", hasLength: false },
  { value: "Picklist", label: "選択リスト", hasPicklist: true },
  { value: "MultiPicklist", label: "複数選択リスト", hasPicklist: true },
  { value: "Email", label: "メール", hasLength: false },
  { value: "Phone", label: "電話", hasLength: false },
  { value: "URL", label: "URL", hasLength: false },
  { value: "Lookup", label: "参照関係", hasReference: true },
];

const fieldSchema = z.object({
  apiName: z
    .string()
    .min(1, "API名は必須です")
    .regex(/^[A-Za-z][A-Za-z0-9_]*(__c)?$/, "API名は英字で始まる必要があります"),
  label: z.string().min(1, "表示ラベルは必須です"),
  dataType: z.string().min(1, "データ型は必須です"),
  isRequired: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  defaultValue: z.string().optional(),
  length: z.number().optional(),
  precision: z.number().optional(),
  scale: z.number().optional(),
  picklistValues: z.array(z.object({
    value: z.string(),
    label: z.string(),
    isDefault: z.boolean().optional(),
  })).optional(),
  referenceObjectId: z.string().optional(),
  description: z.string().optional(),
  helpText: z.string().optional(),
});

// GET /api/objects/[id]/fields - フィールド一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const object = await prisma.objectDefinition.findUnique({
      where: { id },
    });

    if (!object) {
      return notFoundResponse("オブジェクト");
    }

    const fields = await prisma.fieldDefinition.findMany({
      where: { objectId: id },
      include: {
        referenceObject: {
          select: { id: true, apiName: true, label: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: fields, dataTypes: FIELD_DATA_TYPES });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST /api/objects/[id]/fields - フィールド作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = fieldSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const object = await prisma.objectDefinition.findUnique({
      where: { id },
    });

    if (!object) {
      return notFoundResponse("オブジェクト");
    }

    const data = validationResult.data;

    // API名の重複チェック
    const existingField = await prisma.fieldDefinition.findUnique({
      where: {
        objectId_apiName: {
          objectId: id,
          apiName: data.apiName,
        },
      },
    });

    if (existingField) {
      return badRequestResponse("このAPI名は既に使用されています");
    }

    // 最大のsortOrderを取得
    const maxSortOrder = await prisma.fieldDefinition.aggregate({
      where: { objectId: id },
      _max: { sortOrder: true },
    });

    const field = await prisma.fieldDefinition.create({
      data: {
        ...data,
        objectId: id,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
