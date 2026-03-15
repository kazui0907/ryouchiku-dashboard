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

const permissionSchema = z.object({
  objectApiName: z.string().min(1, "オブジェクトAPI名は必須です"),
  canRead: z.boolean().default(false),
  canCreate: z.boolean().default(false),
  canUpdate: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  viewAllRecords: z.boolean().default(false),
  modifyAllRecords: z.boolean().default(false),
});

const bulkPermissionSchema = z.object({
  permissions: z.array(permissionSchema),
});

// GET /api/profiles/[id]/permissions - プロファイルの権限一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const profile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      return notFoundResponse("プロファイル");
    }

    // すべてのオブジェクトと現在の権限を取得
    const [objects, permissions] = await Promise.all([
      prisma.objectDefinition.findMany({
        where: { isActive: true },
        orderBy: { label: "asc" },
      }),
      prisma.objectPermission.findMany({
        where: { profileId: id },
      }),
    ]);

    // 権限マップを作成（objectApiNameをキーに）
    const permissionMap = new Map(
      permissions.map((p) => [p.objectApiName, p])
    );

    // すべてのオブジェクトに対する権限情報を返す
    const result = objects.map((obj) => {
      const perm = permissionMap.get(obj.apiName);
      return {
        objectApiName: obj.apiName,
        objectLabel: obj.label,
        canRead: perm?.canRead || false,
        canCreate: perm?.canCreate || false,
        canUpdate: perm?.canUpdate || false,
        canDelete: perm?.canDelete || false,
        viewAllRecords: perm?.viewAllRecords || false,
        modifyAllRecords: perm?.modifyAllRecords || false,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PUT /api/profiles/[id]/permissions - プロファイルの権限を一括更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();
    const validationResult = bulkPermissionSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0].message);
    }

    const profile = await prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      return notFoundResponse("プロファイル");
    }

    // トランザクションで権限を更新
    await prisma.$transaction(async (tx) => {
      for (const perm of validationResult.data.permissions) {
        await tx.objectPermission.upsert({
          where: {
            profileId_objectApiName: {
              profileId: id,
              objectApiName: perm.objectApiName,
            },
          },
          update: {
            canRead: perm.canRead,
            canCreate: perm.canCreate,
            canUpdate: perm.canUpdate,
            canDelete: perm.canDelete,
            viewAllRecords: perm.viewAllRecords,
            modifyAllRecords: perm.modifyAllRecords,
          },
          create: {
            profileId: id,
            objectApiName: perm.objectApiName,
            canRead: perm.canRead,
            canCreate: perm.canCreate,
            canUpdate: perm.canUpdate,
            canDelete: perm.canDelete,
            viewAllRecords: perm.viewAllRecords,
            modifyAllRecords: perm.modifyAllRecords,
          },
        });
      }
    });

    return NextResponse.json({ message: "権限を更新しました" });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
