import { z } from 'zod';

// GPTレスポンスの基本スキーマ（GPTから直接返ってくる部分）
export const gptResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  conclusion: z.string(),
  points: z.array(z.string()),
  comment: z.string(),
});

// 単一動画分析の完全スキーマ（追加情報を含む）
export const videoAnalysisSchema = gptResponseSchema.extend({
  videoUrl: z.string().url(),
  videoTitle: z.string().optional(),
  channelName: z.string().optional(),
  publishDate: z.string().optional(),
});

// 複数動画分析のスキーマ
export const multiVideoAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  conclusion: z.string(),
  videos: z.array(videoAnalysisSchema),
  keyword: z.string(),
  count: z.number().int().positive(),
});

// 分析結果の共通スキーマ (単一動画または複数動画)
export const analysisResultSchema = z.union([
  videoAnalysisSchema,
  multiVideoAnalysisSchema,
]);

// 型定義のエクスポート
export type VideoAnalysis = z.infer<typeof videoAnalysisSchema>;
export type MultiVideoAnalysis = z.infer<typeof multiVideoAnalysisSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// GPTレスポンスのパース関数
export function parseGptResponse(content: string): z.infer<typeof gptResponseSchema> {
  try {
    // JSONとしてパース
    const parsedContent = JSON.parse(content);
    
    // GPTレスポンススキーマに基づいてバリデーション
    const result = gptResponseSchema.parse(parsedContent);
    
    return result;
  } catch (error) {
    // エラーログ
    console.error('GPTレスポンスのパースに失敗:', error);
    
    // フォールバック: 最低限の構造を持つオブジェクトを返す
    return {
      title: 'パースエラー',
      summary: '分析データの解析中にエラーが発生しました。',
      conclusion: 'データを正しく解析できませんでした。',
      points: ['データの解析に失敗しました。'],
      comment: 'システムエラーが発生しました。再試行してください。',
    };
  }
} 