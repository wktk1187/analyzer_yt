import { NextResponse } from 'next/server';
import { getTranscript } from '@/utils/getTranscript';
import { searchVideos, getVideoDetails, analyzeTranscript, combineAnalysisResults } from '@/services/analyzer';

export async function POST(request: Request) {
  try {
    console.log('検索・分析APIが呼び出されました');
    
    // リクエストからキーワードを取得
    const { keyword } = await request.json();
    console.log(`検索キーワード: ${keyword}`);

    if (!keyword) {
      console.error('検索キーワードが空です');
      return NextResponse.json(
        { error: '検索キーワードが必要です' },
        { status: 400 }
      );
    }

    // 環境変数の確認
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('YOUTUBE_API_KEYが設定されていません');
      return NextResponse.json(
        { error: 'YouTube API設定エラー' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEYが設定されていません');
      return NextResponse.json(
        { error: 'OpenAI API設定エラー' },
        { status: 500 }
      );
    }

    // 進捗状況レスポンス用のオブジェクト
    const progress = {
      status: 'searching',
      message: 'YouTube動画を検索中...',
      step: 1,
      totalSteps: 4
    };

    // YouTube APIを使用して動画を検索
    console.log('YouTube動画検索を開始します');
    const videos = await searchVideos(keyword);
    console.log(`検索結果: ${videos.length}件の動画が見つかりました`);

    if (!videos || videos.length === 0) {
      console.error('条件に合う動画が見つかりませんでした');
      return NextResponse.json(
        { error: '条件に合う動画が見つかりませんでした' },
        { status: 404 }
      );
    }

    // 各動画を分析
    console.log('動画の分析を開始します');
    progress.status = 'analyzing';
    progress.message = '動画の内容を分析中...';
    progress.step = 2;

    const analysisPromises = videos.map(async (video, index) => {
      try {
        const videoId = video.id.videoId;
        console.log(`動画ID ${videoId} の分析を開始します (${index + 1}/${videos.length})`);
        
        console.log(`動画ID ${videoId} の字幕を取得します`);
        const transcript = await getTranscript(videoId);
        console.log(`動画ID ${videoId} の字幕取得が完了しました`);
        
        // 動画情報を取得
        console.log(`動画ID ${videoId} の詳細情報を取得します`);
        const videoDetails = await getVideoDetails(videoId);
        console.log(`動画ID ${videoId} の詳細情報取得が完了しました`);
        
        // 分析を実行
        console.log(`動画ID ${videoId} の内容分析を開始します`);
        const analysis = await analyzeTranscript(
          transcript, 
          `https://www.youtube.com/watch?v=${videoId}`,
          videoDetails.snippet.title,
          videoDetails.snippet.channelTitle,
          new Date(videoDetails.snippet.publishedAt).toLocaleDateString('ja-JP')
        );
        console.log(`動画ID ${videoId} の分析が完了しました`);
        
        return analysis;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        console.error(`動画 ${video.id.videoId} の分析エラー: ${errorMessage}`, error);
        return null;
      }
    });

    // すべての分析結果を待機
    console.log('すべての分析結果を取得中...');
    progress.status = 'processing';
    progress.message = '分析結果を処理中...';
    progress.step = 3;
    
    const analysisResults = await Promise.all(analysisPromises);
    
    // nullでない結果のみをフィルタリング
    const validResults = analysisResults.filter(result => result !== null);
    console.log(`有効な分析結果: ${validResults.length}件`);

    if (validResults.length === 0) {
      console.error('すべての動画の分析に失敗しました');
      return NextResponse.json(
        { error: 'すべての動画の分析に失敗しました' },
        { status: 500 }
      );
    }

    // 複数の分析結果を1つのレポートにまとめる
    console.log('分析結果をまとめています...');
    progress.status = 'combining';
    progress.message = '最終レポートを作成中...';
    progress.step = 4;
    
    const combinedAnalysis = combineAnalysisResults(validResults, keyword);
    console.log('分析レポートの作成が完了しました');
    
    progress.status = 'complete';
    progress.message = '分析が完了しました';

    // レスポンスを返す
    return NextResponse.json({
      ...combinedAnalysis,
      progress
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('検索・分析エラー:', errorMessage, error);
    return NextResponse.json(
      { error: `検索・分析中にエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
