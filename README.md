This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 認証機能

このアプリケーションには、特定のメールアドレスとパスワードでのみログインできる認証機能が実装されています。

### ローカル環境での設定

1. `.env.local` ファイルに以下の環境変数を設定します：

```
ADMIN_EMAIL=あなたのメールアドレス
ADMIN_PASSWORD=あなたのパスワード
```

### Vercelでのデプロイ設定

1. Vercelダッシュボードで、プロジェクトの「Settings」タブを選択
2. 「Environment Variables」セクションで以下の環境変数を追加：
   - `ADMIN_EMAIL`: 管理者のメールアドレス
   - `ADMIN_PASSWORD`: 管理者のパスワード（安全な複雑なパスワードを使用してください）
3. その他の必要な環境変数（`OPENAI_API_KEY`、`YOUTUBE_API_KEY`など）も忘れずに設定
4. 「Save」をクリック
5. プロジェクトを再デプロイして設定を反映

**セキュリティに関する注意事項**:
- 本番環境では、長くて複雑なパスワードを使用してください
- 将来的には、よりセキュアな認証システム（JWT認証やOAuth）への移行を検討してください
