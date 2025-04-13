"use client";

import { useState } from "react";

// 分析結果の型定義
interface VideoAnalysis {
  title: string;
  summary: string;
  conclusion: string;
  points: string[];
  comment: string;
  videoUrl: string;
  videoTitle?: string;
  channelName?: string;
  publishDate?: string;
}

// 複数動画分析結果の型定義
interface MultiVideoAnalysis {
  title: string;
  summary: string;
  conclusion: string;
  videos: VideoAnalysis[];
  keyword: string;
  count: number;
}

// 分析結果の共通型
type AnalysisResult = VideoAnalysis | MultiVideoAnalysis;

export default function Home() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("分析中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/search-and-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("検索・分析中にエラーが発生しました:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 結果が複数動画分析かどうかを判定する関数
  const isMultiVideoResult = (result: AnalysisResult): result is MultiVideoAnalysis => {
    return 'videos' in result;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">YouTube分析ツール</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* URL入力フォーム */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">URL分析</h2>
                <form onSubmit={handleUrlSubmit}>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="YouTube動画のURLを入力"
                    />
                  </div>
                  <div className="mt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !url}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isLoading ? "分析中..." : "分析する"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* キーワード入力フォーム */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">キーワード検索・分析</h2>
                <form onSubmit={handleKeywordSubmit}>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="キーワードを入力（最大5本の動画を分析）"
                    />
                  </div>
                  <div className="mt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !keyword}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isLoading ? "検索・分析中..." : "検索・分析する"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* 分析結果表示 */}
          {isLoading && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
              <p className="text-center mt-4 text-gray-500">分析中です。しばらくお待ちください...</p>
            </div>
          )}

          {result && !isLoading && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">分析結果</h3>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6 prose max-w-none">
                  {/* 単一動画分析の場合 */}
                  {!isMultiVideoResult(result) && (
                    <>
                      {/* タイトル */}
                      <h2 className="text-xl font-bold mb-4">{result.title}</h2>
                      
                      {/* 概要 */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">概要</h3>
                        <p>{result.summary}</p>
                      </div>
                      
                      {/* 主張・結論 */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">この動画の主張・結論</h3>
                        <p>{result.conclusion}</p>
                      </div>
                      
                      {/* 分析ポイント */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">分析ポイント</h3>
                        <ul className="list-disc pl-5">
                          {result.points && result.points.map((point: string, index: number) => (
                            <li key={index} className="mb-2">{point}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* コメント */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">私の一言コメント</h3>
                        <p className="italic">{result.comment}</p>
                      </div>
                      
                      {/* 元動画情報 */}
                      <div className="mt-8 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                          <a 
                            href={result.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            元動画を見る
                          </a>
                          {result.publishDate && ` • 投稿日: ${result.publishDate}`}
                          {result.channelName && ` • チャンネル名: ${result.channelName}`}
                        </p>
                      </div>
                    </>
                  )}

                  {/* 複数動画分析の場合 */}
                  {isMultiVideoResult(result) && (
                    <>
                      {/* タイトル */}
                      <h2 className="text-xl font-bold mb-4">{result.title}</h2>
                      
                      {/* 概要 */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">概要</h3>
                        <p>{result.summary}</p>
                      </div>
                      
                      {/* 共通の結論 */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">全体の結論</h3>
                        <p>{result.conclusion}</p>
                      </div>
                      
                      {/* 各動画の分析結果 */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">各動画の分析</h3>
                        
                        <div className="space-y-8 mt-4">
                          {result.videos.map((video: VideoAnalysis, videoIndex: number) => (
                            <div key={videoIndex} className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="text-md font-bold mb-2">
                                {videoIndex + 1}. {video.title}
                              </h4>
                              
                              <div className="mb-4">
                                <h5 className="text-sm font-medium mb-1">概要</h5>
                                <p className="text-sm">{video.summary}</p>
                              </div>
                              
                              <div className="mb-4">
                                <h5 className="text-sm font-medium mb-1">主張・結論</h5>
                                <p className="text-sm">{video.conclusion}</p>
                              </div>
                              
                              <div className="mb-4">
                                <h5 className="text-sm font-medium mb-1">分析ポイント</h5>
                                <ul className="list-disc pl-5 text-sm">
                                  {video.points && video.points.map((point: string, index: number) => (
                                    <li key={index} className="mb-1">{point}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="mb-4">
                                <h5 className="text-sm font-medium mb-1">私の一言コメント</h5>
                                <p className="text-sm italic">{video.comment}</p>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                <a 
                                  href={video.videoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-500"
                                >
                                  元動画を見る
                                </a>
                                {video.publishDate && ` • 投稿日: ${video.publishDate}`}
                                {video.channelName && ` • チャンネル名: ${video.channelName}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
