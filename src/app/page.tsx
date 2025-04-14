"use client";

import { useState, useEffect } from "react";

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
  const [progress, setProgress] = useState({
    status: '',
    message: '',
    step: 0,
    totalSteps: 4
  });
  const [error, setError] = useState<string | null>(null);
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);

  // ローカルストレージから検索履歴を読み込む
  useEffect(() => {
    const savedKeywords = localStorage.getItem('recentKeywords');
    if (savedKeywords) {
      setRecentKeywords(JSON.parse(savedKeywords));
    }
  }, []);

  // 検索履歴を保存する関数
  const saveKeyword = (newKeyword: string) => {
    const updatedKeywords = [newKeyword, ...recentKeywords.filter(k => k !== newKeyword)].slice(0, 5);
    setRecentKeywords(updatedKeywords);
    localStorage.setItem('recentKeywords', JSON.stringify(updatedKeywords));
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setProgress({
      status: 'analyzing',
      message: '動画を分析中...',
      step: 1,
      totalSteps: 2
    });
    
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析中にエラーが発生しました');
      }

      const data = await response.json();
      setResult(data);
      setProgress({
        status: 'complete',
        message: '分析が完了しました',
        step: 2,
        totalSteps: 2
      });
    } catch (error) {
      console.error("分析中にエラーが発生しました:", error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
      setProgress({
        status: 'error',
        message: 'エラーが発生しました',
        step: 0,
        totalSteps: 2
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    // 履歴に追加
    saveKeyword(keyword);
    
    setIsLoading(true);
    setError(null);
    setProgress({
      status: 'searching',
      message: 'YouTube動画を検索中...',
      step: 1,
      totalSteps: 4
    });
    
    try {
      const response = await fetch("/api/search-and-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '検索・分析中にエラーが発生しました');
      }

      const data = await response.json();
      
      // 進捗状態を更新
      if (data.progress) {
        setProgress(data.progress);
      }
      
      setResult(data);
    } catch (error) {
      console.error("検索・分析中にエラーが発生しました:", error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
      setProgress({
        status: 'error',
        message: 'エラーが発生しました',
        step: 0,
        totalSteps: 4
      });
    } finally {
      setIsLoading(false);
    }
  };

  // キーワードを再利用する関数
  const handleKeywordReuse = (savedKeyword: string) => {
    setKeyword(savedKeyword);
  };

  // 結果が複数動画分析かどうかを判定する関数
  const isMultiVideoResult = (result: AnalysisResult): result is MultiVideoAnalysis => {
    return 'videos' in result;
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                      placeholder="キーワードを入力（複数の動画を分析）"
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
                
                {/* 最近の検索キーワード */}
                {recentKeywords.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">最近の検索:</h3>
                    <div className="flex flex-wrap gap-2">
                      {recentKeywords.map((k, index) => (
                        <button
                          key={index}
                          onClick={() => handleKeywordReuse(k)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 進捗状況表示 */}
          {isLoading && (
            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">{progress.message}</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ inlineSize: `${(progress.step / progress.totalSteps) * 100}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-500">ステップ {progress.step}/{progress.totalSteps}</p>
              </div>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
              <p className="text-center mt-4 text-gray-500">{progress.status === 'analyzing' ? '分析には数分かかることがあります...' : '処理中です。しばらくお待ちください...'}</p>
            </div>
          )}

          {/* 分析結果表示 */}
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
                                  {video.points.map((point, pointIndex) => (
                                    <li key={pointIndex}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="mb-4">
                                <h5 className="text-sm font-medium mb-1">コメント</h5>
                                <p className="text-sm italic">{video.comment}</p>
                              </div>
                              
                              <div className="mt-3 text-xs text-gray-500">
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
