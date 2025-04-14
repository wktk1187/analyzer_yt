import axios from 'axios';
import OpenAI from 'openai';
import { getTranscript } from '@/utils/getTranscript';
import { VideoAnalysis, MultiVideoAnalysis, parseGptResponse } from './schemas';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// YouTube Data API v3のキー
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// 検索条件
const MAX_VIDEOS = 3; // 5から3に減らしてパフォーマンス向上
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

/**
 * 字幕を分析してレポートを生成する
 * @param transcript 字幕テキスト
 * @param videoUrl 動画URL
 * @param videoTitle 動画タイトル
 * @param channelName チャンネル名
 * @param publishDate 公開日
 * @returns 分析レポート
 */
export async function analyzeTranscript(
  transcript: string, 
  videoUrl: string, 
  videoTitle: string, 
  channelName: string, 
  publishDate: string
): Promise<VideoAnalysis> {
  try {
    console.log(`分析開始: ${videoTitle}`);
    
    // プロンプトの作成
    const prompt = `
あなたはYouTube動画の分析エキスパートです。以下の字幕テキストから動画の内容を分析し、要約してください。
カジュアルな話し言葉で、以下の形式でレポートを作成してください。

■ タイトル（動画内容を端的に表す）
■ 概要（要点のまとめ）
■ この動画の主張・結論
■ 分析ポイント（3〜5項目、箇条書き）
■ 私の一言コメント（主観的なまとめ）

字幕テキスト:
${transcript.substring(0, 15000)} // 15000文字に制限して処理速度向上

レスポンスは必ずJSON形式で返してください。以下のようなJSONオブジェクト構造で返してください：
{
  "title": "タイトル",
  "summary": "概要",
  "conclusion": "主張・結論",
  "points": ["ポイント1", "ポイント2", "ポイント3"],
  "comment": "一言コメント"
}
`;

    // OpenAI APIを呼び出し
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125", // より高速で安価なモデルを使用
      messages: [
        { role: "system", content: "あなたはYouTube動画の分析エキスパートです。JSONフォーマットで応答してください。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    // レスポンスを処理
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('APIからのレスポンスが空です');
    }

    console.log(`分析完了: ${videoTitle}`);
    
    // zodでバリデーション
    const result = parseGptResponse(content);
    
    // 動画情報を追加
    return {
      ...result,
      videoUrl,
      videoTitle,
      channelName,
      publishDate,
    };
  } catch (error) {
    console.error('動画分析エラー:', error);
    throw new Error('動画の分析に失敗しました');
  }
}

/**
 * YouTube APIを使用して動画を検索する
 * @param keyword 検索キーワード
 * @returns 検索結果の動画リスト
 */
export async function searchVideos(keyword: string): Promise<YouTubeVideo[]> {
  try {
    console.log(`YouTube検索開始: ${keyword}`);
    
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
      .slice(0, MAX_VIDEOS); // 最大N本に制限

    // 元の検索結果と詳細情報をマージ
    const results = response.data.items
      .filter((item: YouTubeVideo) => 
        filteredVideos.some((video: YouTubeVideoDetails) => video.id === item.id.videoId)
      )
      .slice(0, MAX_VIDEOS);
      
    console.log(`YouTube検索結果: ${results.length}件`);
    return results;
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
export async function getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
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
 * 複数動画の分析結果を統合し、共通点を抽出する
 * @param results 各動画の分析結果
 * @param keyword 検索キーワード
 * @returns 統合された分析結果
 */
export function combineAnalysisResults(results: VideoAnalysis[], keyword: string): MultiVideoAnalysis {
  console.log(`分析結果の統合: ${results.length}件`);
  
  // 共通のタイトルを作成
  const title = `「${keyword}」に関する動画${results.length}本の分析`;
  
  // 共通の概要を作成（各動画の概要を統合）
  const summary = `「${keyword}」をテーマにした複数の動画を分析した結果、以下のような共通点と相違点が見つかりました。`;
  
  // 共通の結論を抽出
  const conclusion = `全体を通して、「${keyword}」については${createCommonConclusion(results)}`;
  
  // 結果をまとめる
  return {
    title,
    summary,
    conclusion,
    videos: results,
    keyword,
    count: results.length,
  };
}

/**
 * 複数の分析から共通の結論を抽出する
 * @param results 各動画の分析結果
 * @returns 共通の結論
 */
function createCommonConclusion(results: VideoAnalysis[]): string {
  // 各結論からキーワードを抽出して、共通点を見つける簡易的な実装
  // 実際にはより高度なテキスト分析が必要
  const commonPhrases = findCommonPhrases(results.map(r => r.conclusion));
  
  if (commonPhrases.length > 0) {
    return `${commonPhrases.join('、')}などの共通点が見られました。`;
  } else {
    return `様々な視点や意見が存在することがわかりました。`;
  }
}

/**
 * 複数のテキストから共通フレーズを抽出する簡易実装
 * @param texts 分析するテキスト配列
 * @returns 共通フレーズ
 */
function findCommonPhrases(texts: string[]): string[] {
  if (texts.length < 2) return [];
  
  // 簡易的な共通キーワード抽出（本来はNLPライブラリ使用が望ましい）
  const commonWords = ['重要', '必要', 'ポイント', '効果的', '注目'];
  const result: string[] = [];
  
  // 各テキストに共通して現れる単語を抽出
  commonWords.forEach(word => {
    let count = 0;
    texts.forEach(text => {
      if (text.includes(word)) count++;
    });
    
    // 半数以上のテキストに出現する単語を共通点とみなす
    if (count >= texts.length / 2) {
      result.push(word);
    }
  });
  
  return result;
} 