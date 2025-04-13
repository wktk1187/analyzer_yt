import { NextResponse } from 'next/server';
import { getTranscriptFromUrl } from '@/utils/getTranscript';
import OpenAI from 'openai';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // リクエストからURLを取得
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URLが必要です' },
        { status: 400 }
      );
    }

    // YouTube動画の字幕を取得
    const transcript = await getTranscriptFromUrl(url);

    if (!transcript) {
      return NextResponse.json(
        { error: '字幕を取得できませんでした' },
        { status: 404 }
      );
    }

    // 動画IDを抽出してURLを構築
    const videoUrl = url;

    // GPT-4-turboを使用して分析
    const analysis = await analyzeTranscript(transcript, videoUrl);

    // レスポンスを返す
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('分析エラー:', error);
    return NextResponse.json(
      { error: error.message || '分析中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 字幕を分析してレポートを生成する
 * @param transcript 字幕テキスト
 * @param videoUrl 動画URL
 * @returns 分析レポート
 */
async function analyzeTranscript(transcript: string, videoUrl: string) {
  try {
    // プロンプトの作成
    const prompt = `
あなたはYouTube動画の分析エキスパートです。以下の字幕テキストから動画の内容を分析し、要約してください。
カジュアルな話し言葉で、以下の形式でレポートを作成してください。

■ タイトル（動画内容を端的に表す）
■ 概要（要点のまとめ）
■ この動画の主張・結論
■ 分析ポイント（3〜5項目、箇条書き）
■ 私の一言コメント（主観的なまとめ）

以下が字幕テキストです：
${transcript}

動画URL: ${videoUrl}

レスポンスはJSON形式で以下のフィールドを含めてください：
{
  "title": "タイトル",
  "summary": "概要",
  "conclusion": "主張・結論",
  "points": ["ポイント1", "ポイント2", "ポイント3"],
  "comment": "一言コメント",
  "videoUrl": "${videoUrl}"
}
`;

    // GPT-4-turboによる分析
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたはYouTube動画の分析エキスパートです。動画の内容を簡潔に要約し、重要なポイントを抽出します。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    // レスポンスからJSONを抽出
    const content = response.choices[0]?.message?.content || '';
    const analysisResult = JSON.parse(content);

    return {
      ...analysisResult,
      videoUrl
    };
  } catch (error) {
    console.error('GPT分析エラー:', error);
    throw new Error('動画の分析に失敗しました');
  }
}
