import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // レスポンスを作成
    const response = NextResponse.json(
      { success: true, message: 'ログアウトに成功しました' },
      { status: 200 }
    );

    // 認証クッキーを削除
    response.cookies.delete('auth_session');

    return response;
  } catch (error) {
    console.error('ログアウト処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { success: false, message: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
} 