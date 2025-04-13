import { YoutubeTranscript } from 'youtube-transcript';

/**
 * YouTube URLからビデオIDを抽出する
 * @param url YouTube動画のURL
 * @returns ビデオID
 */
export const extractVideoId = (url: string): string | null => {
  // 通常のYouTube URL (例: https://www.youtube.com/watch?v=VIDEO_ID)
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * YouTube動画の字幕を取得する
 * @param videoId YouTube動画のID
 * @returns 時間付きの字幕テキスト
 */
export const getTranscript = async (videoId: string): Promise<string> => {
  try {
    console.log(`トランスクリプト取得開始: videoId=${videoId}`);
    
    // 字幕を取得（日本語優先、なければ英語、それもなければ自動字幕）
    let transcriptItems;
    try {
      // まず日本語を試す
      console.log('日本語の字幕を試行中...');
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'ja',
      });
      console.log('日本語の字幕を取得しました');
    } catch (jaError) {
      console.log('日本語の字幕取得に失敗:', jaError);
      try {
        // 次に英語を試す
        console.log('英語の字幕を試行中...');
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: 'en',
        });
        console.log('英語の字幕を取得しました');
      } catch (enError) {
        console.log('英語の字幕取得に失敗:', enError);
        // 最後に自動字幕を試す
        console.log('自動字幕を試行中...');
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        console.log('自動字幕を取得しました');
      }
    }

    if (!transcriptItems || transcriptItems.length === 0) {
      console.error('字幕データが空です');
      throw new Error('字幕が見つかりませんでした');
    }

    console.log(`取得した字幕数: ${transcriptItems.length}件`);

    // 時間付きのテキストに整形
    const formattedTranscript = transcriptItems.map(item => {
      // 時間を分:秒形式に変換
      const minutes = Math.floor(item.offset / 60000);
      const seconds = Math.floor((item.offset % 60000) / 1000);
      const timeStamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      return `[${timeStamp}] ${item.text}`;
    }).join('\n');

    console.log('字幕データの整形が完了しました');
    return formattedTranscript;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    console.error(`字幕取得エラー: ${errorMessage}`, error);
    throw new Error(`字幕の取得に失敗しました: ${errorMessage}`);
  }
};

/**
 * YouTube URLから字幕を取得する
 * @param url YouTube動画のURL
 * @returns 時間付きの字幕テキスト
 */
export const getTranscriptFromUrl = async (url: string): Promise<string> => {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    throw new Error('有効なYouTube URLではありません');
  }
  
  return await getTranscript(videoId);
};
