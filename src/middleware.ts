import { NextRequest, NextResponse } from 'next/server';

// 公開パスのリスト（認証が不要なパス）
const publicPaths = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  // リクエストのパスを取得
  const path = request.nextUrl.pathname;
  
  // 公開パスの場合は認証をスキップ
  if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }
  
  // API関連のパスは認証をスキップ（必要に応じて変更可）
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // 認証クッキーを確認
  const authCookie = request.cookies.get('auth_session');
  
  // クッキーがない場合はログインページにリダイレクト
  if (!authCookie || authCookie.value !== 'authenticated') {
    const loginUrl = new URL('/login', request.url);
    // リダイレクト先のパスをクエリパラメータに追加（オプション）
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }
  
  // 認証済みならそのまま続行
  return NextResponse.next();
}

// ミドルウェアを適用するパスを指定
export const config = {
  matcher: [
    // すべてのパスに適用するが、静的ファイルは除外
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 