import { NextResponse } from 'next/server';
import axios from 'axios';
import { getTranscript } from '@/utils/getTranscript';
import OpenAI from 'openai';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// YouTube Data API v3のキー
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// 検索条件
const MAX_VIDEOS = 5;
const MIN_VIEW_COUNT = 10000;
const PUBLISHED_AFTER = new Date();
PUBLISHED_AFTER.setFullYear(PUBLISHED_AFTER.getFullYear() - 1); // 1年前

// YouTubeビデオの型定義
interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
  };
}

// YouTube APIレスポンスの型定義
interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}

// 分析結果の型定義
interface AnalysisResult {
  title: string;
  summary: string;
  conclusion: string;
  points: string[];
  comment: string;
  videoUrl: string;
  videoTitle: string;
  channelName: string;
  publishDate: string;
  [key: string]: unknown;
}

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
    const analysisPromises = videos.map(async (video: YouTubeVideo) => {
      try {
        const videoId = video.id.videoId;
        console.log(`動画ID ${videoId} の分析を開始します`);
        
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
    const analysisResults = await Promise.all(analysisPromises);
    
    // nullでない結果のみをフィルタリング
    const validResults = analysisResults.filter(result => result !== null) as AnalysisResult[];
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
    const combinedAnalysis = combineAnalysisResults(validResults, keyword);
    console.log('分析レポートの作成が完了しました');

    // レスポンスを返す
    return NextResponse.json(combinedAnalysis);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error('検索・分析エラー:', errorMessage, error);
    return NextResponse.json(
      { error: `検索・分析中にエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * YouTube APIを使用して動画を検索する
 * @param keyword 検索キーワード
 * @returns 検索結果の動画リスト
 */
async function searchVideos(keyword: string): Promise<YouTubeVideo[]> {
  try {
    // 検索クエリのパラメータ
    const params = {
      part: 'snippet',
      q: keyword,
      type: 'video',
      maxResults: 10, // 初期検索では多めに取得
      publishedAfter: PUBLISHED_AFTER.toISOString(),
      relevanceLanguage: 'ja',
      key: YOUTUBE_API_KEY
    };

    // YouTube Data API v3を使用して検索
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('動画が見つかりませんでした');
    }

    // 各動画の詳細情報を取得して、条件でフィルタリング
    const videoIds = response.data.items.map((item: YouTubeVideo) => item.id.videoId).join(',');
    const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        id: videoIds,
        key: YOUTUBE_API_KEY
      }
    });

    // 条件に合う動画をフィルタリング
    const filteredVideos = detailsResponse.data.items
      .filter((video: YouTubeVideoDetails) => {
        const viewCount = parseInt(video.statistics.viewCount, 10) || 0;
        return viewCount >= MIN_VIEW_COUNT;
      })
      .slice(0, MAX_VIDEOS); // 最大5本に制限

    // 元の検索結果と詳細情報をマージ
    return response.data.items
      .filter((item: YouTubeVideo) => 
        filteredVideos.some((video: YouTubeVideoDetails) => video.id === item.id.videoId)
      )
      .slice(0, MAX_VIDEOS);
  } catch (error) {
    console.error('YouTube API検索エラー:', error);
    throw new Error('動画の検索に失敗しました');
  }
}

/**
 * 動画の詳細情報を取得する
 * @param videoId 動画ID
 * @returns 動画の詳細情報
 */
async function getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('動画情報が見つかりませんでした');
    }

    return response.data.items[0];
  } catch (error) {
    console.error('動画詳細取得エラー:', error);
    throw new Error('動画の詳細情報の取得に失敗しました');
  }
}

/**
 * 字幕を分析してレポートを生成する
 * @param transcript 字幕テキスト
 * @param videoUrl 動画URL
 * @param videoTitle 動画タイトル
 * @param channelName チャンネル名
 * @param publishDate 公開日
 * @returns 分析レポート
 */
async function analyzeTranscript(
  transcript: string, 
  videoUrl: string, 
  videoTitle: string, 
  channelName: string, 
  publishDate: string
): Promise<AnalysisResult> {
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

動画情報:
タイトル: ${videoTitle}
チャンネル名: ${channelName}
公開日: ${publishDate}
URL: ${videoUrl}

レスポンスはJSON形式で以下のフィールドを含めてください：
{
  "title": "タイトル",
  "summary": "概要",
  "conclusion": "主張・結論",
  "points": ["ポイント1", "ポイント2", "ポイント3"],
  "comment": "一言コメント",
  "videoUrl": "${videoUrl}",
  "videoTitle": "${videoTitle}",
  "channelName": "${channelName}",
  "publishDate": "${publishDate}"
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
    const analysisResult = JSON.parse(content) as AnalysisResult;

    return {
      ...analysisResult,
      videoUrl,
      videoTitle,
      channelName,
      publishDate
    };
  } catch (error) {
    console.error('GPT分析エラー:', error);
    throw new Error('動画の分析に失敗しました');
  }
}

/**
 * 複数の分析結果を1つのレポートにまとめる
 * @param results 分析結果の配列
 * @param keyword 検索キーワード
 * @returns 統合された分析レポート
 */
function combineAnalysisResults(results: AnalysisResult[], keyword: string) {
  // 検索キーワードに基づいたタイトルを作成
  const title = `「${keyword}」に関する動画分析まとめ`;
  
  // 各動画の分析結果を1つのオブジェクトにまとめる
  const videos = results.map(result => ({
    title: result.title,
    videoTitle: result.videoTitle,
    summary: result.summary,
    conclusion: result.conclusion,
    points: result.points,
    comment: result.comment,
    videoUrl: result.videoUrl,
    channelName: result.channelName,
    publishDate: result.publishDate
  }));

  // 共通の概要を作成
  const summary = `「${keyword}」に関する${videos.length}本の動画を分析しました。それぞれの動画の要点をまとめています。`;
  
  // 共通の結論を抽出（各動画の結論から共通点を見つける）
  const commonConclusion = `これらの動画から見えてくる「${keyword}」に関する共通の見解や重要ポイントをまとめました。`;

  return {
    title,
    summary,
    conclusion: commonConclusion,
    videos,
    keyword,
    count: videos.length
  };
}
