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
    // 字幕を取得（日本語優先、なければ英語、それもなければ自動字幕）
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'ja',
    }).catch(() => 
      YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
      })
    ).catch(() => 
      YoutubeTranscript.fetchTranscript(videoId)
    );

    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('字幕が見つかりませんでした');
    }

    // 時間付きのテキストに整形
    const formattedTranscript = transcriptItems.map(item => {
      // 時間を分:秒形式に変換
      const minutes = Math.floor(item.offset / 60000);
      const seconds = Math.floor((item.offset % 60000) / 1000);
      const timeStamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      return `[${timeStamp}] ${item.text}`;
    }).join('\n');

    return formattedTranscript;
  } catch (error) {
    console.error('字幕取得エラー:', error);
    throw new Error('字幕の取得に失敗しました');
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
