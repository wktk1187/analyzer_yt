import { NextResponse } from 'next/server';
import { getTranscript } from '@/utils/getTranscript';

export async function GET(request: Request) {
  try {
    // URLから動画IDを取得
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoIdクエリパラメータが必要です' },
        { status: 400 }
      );
    }

    console.log(`テスト: 動画ID ${videoId} の字幕を取得します`);
    
    // YouTube API Keyの確認
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('YOUTUBE_API_KEYが設定されていません');
      return NextResponse.json(
        { error: 'YouTube API設定エラー' },
        { status: 500 }
      );
    }

    // 字幕を取得
    const transcript = await getTranscript(videoId);
    
    // 結果を返す
    return NextResponse.json({
      success: true,
      videoId,
      transcript: transcript.substring(0, 1000), // 最初の1000文字だけ返す
      transcriptLength: transcript.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('字幕取得テストエラー:', errorMessage, error);
    return NextResponse.json(
      { 
        success: false,
        error: `字幕取得中にエラーが発生しました: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
} 