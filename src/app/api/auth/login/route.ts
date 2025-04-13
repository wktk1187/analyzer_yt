import { NextRequest, NextResponse } from 'next/server';

// 認証情報を環境変数から取得するか、ハードコードします
// 本番環境では環境変数を使用することを強く推奨します
const ALLOWED_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ALLOWED_PASSWORD = process.env.ADMIN_PASSWORD || 'securepassword123';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 認証情報の検証
    if (email === ALLOWED_EMAIL && password === ALLOWED_PASSWORD) {
      // ログイン成功
      // JWTやクッキーの設定はここで行います
      const response = NextResponse.json(
        { success: true, message: 'ログインに成功しました' },
        { status: 200 }
      );

      // セッションクッキーを設定（24時間有効）
      response.cookies.set({
        name: 'auth_session',
        value: 'authenticated',
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24時間（秒単位）
        sameSite: 'strict',
      });

      return response;
    } else {
      // ログイン失敗
      return NextResponse.json(
        { success: false, message: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('ログイン処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
} 