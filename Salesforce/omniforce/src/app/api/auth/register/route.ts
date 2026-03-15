import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  name: z.string().min(1, "名前を入力してください"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
    }

    // デフォルトプロファイル（Standard User）を取得または作成
    let defaultProfile = await prisma.profile.findUnique({
      where: { name: "Standard User" },
    });

    if (!defaultProfile) {
      defaultProfile = await prisma.profile.create({
        data: {
          name: "Standard User",
          description: "標準ユーザープロファイル",
          isSystem: true,
        },
      });

      // 標準オブジェクトへの基本権限を付与
      const standardObjects = [
        "Account",
        "Contact",
        "Opportunity",
        "Lead",
        "Case",
        "Task",
      ];

      for (const objectName of standardObjects) {
        await prisma.objectPermission.create({
          data: {
            profileId: defaultProfile.id,
            objectApiName: objectName,
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: false,
            viewAllRecords: false,
            modifyAllRecords: false,
          },
        });
      }
    }

    // ユーザーを作成
    const user = await createUser(email, password, name, defaultProfile.id);

    return NextResponse.json(
      {
        message: "ユーザー登録が完了しました",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "ユーザー登録に失敗しました" },
      { status: 500 }
    );
  }
}
