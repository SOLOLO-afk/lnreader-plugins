// Force trigger CI build
// 1. 匯入必要的模組與型別
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@typings/plugin';
// 修正：依賴標準的 cheerio 套件，匯入 load 函數並賦予別名 parseHTML
import { load as parseHTML } from 'cheerio';

// 2. 宣告類別並實作 Plugin 介面
class MyNovelSite implements Plugin.PluginBase {
  // === 定義外掛基本資訊 ===
  id = 'my_novel_site_id';
  name = 'My Novel Site';
  site = 'https://www.example.com';
  version = '1.0.0';
  icon = 'src/en/mynovelsite/icon.png'; // 需確保該路徑有放置圖片

  // === 方法 1：獲取首頁/熱門小說列表 ===
  async popularNovels(
    page: number,
    options: Plugin.PopularNovelsOptions,
  ): Promise<Plugin.NovelItem[]> {
    // 發送網路請求獲取第 page 頁的 HTML
    const body = await fetchApi(`${this.site}/popular?page=${page}`).then(res =>
      res.text(),
    );
    const loadedCheerio = parseHTML(body);
    const novels: Plugin.NovelItem[] = [];

    // 尋找網頁上的小說列表節點並迴圈處理
    loadedCheerio('.novel-list-item').each((index, element) => {
      const novelName = loadedCheerio(element).find('h2.title').text().trim();
      const novelCover = loadedCheerio(element).find('img').attr('src');
      const novelUrl = loadedCheerio(element).find('a').attr('href');

      // 如果有找到網址，將其推入陣列
      if (novelUrl) {
        novels.push({
          name: novelName,
          cover: novelCover,
          path: novelUrl, // 建議存為相對路徑
        });
      }
    });
    return novels; // 回傳給 APP 顯示
  }

  // === 方法 2：解析單一小說詳情（簡介、作者、章節目錄） ===
  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const body = await fetchApi(this.site + novelPath).then(res => res.text());
    const loadedCheerio = parseHTML(body);

    // 宣告回傳的小說物件
    const novel: Plugin.SourceNovel = {
      path: novelPath,
      name: loadedCheerio('h1.novel-title').text().trim(),
      cover: loadedCheerio('.novel-cover img').attr('src'),
      summary: loadedCheerio('.novel-summary').text().trim(),
      author: loadedCheerio('.novel-author').text().trim(),
      chapters: [],
    };

    // 抓取章節清單
    loadedCheerio('.chapter-list li a').each((index, element) => {
      novel.chapters?.push({
        name: loadedCheerio(element).text().trim(),
        path: loadedCheerio(element).attr('href') || '',
      });
    });

    return novel;
  }

  // === 方法 3：解析單一章節正文 ===
  async parseChapter(chapterPath: string): Promise<string> {
    const body = await fetchApi(this.site + chapterPath).then(res =>
      res.text(),
    );
    const loadedCheerio = parseHTML(body);

    // 抓取包含正文的 div
    let chapterText = loadedCheerio('#chapter-content').html() || '';

    // (可選) 在這裡清除廣告標籤或不需要的 script

    return chapterText; // APP 會自動把 HTML 轉成原生文字渲染
  }

  // === 方法 4：支援搜尋功能 ===
  async searchNovels(
    searchTerm: string,
    page: number,
  ): Promise<Plugin.NovelItem[]> {
    // 利用 encodeURIComponent 處理搜尋關鍵字，避免特殊字元錯誤
    const searchUrl = `${this.site}/search?q=${encodeURIComponent(searchTerm)}&page=${page}`;
    const body = await fetchApi(searchUrl).then(res => res.text());
    const loadedCheerio = parseHTML(body);
    const novels: Plugin.NovelItem[] = [];

    // 遍歷搜尋結果列表（請確保 CSS 選擇器與目標網站一致）
    loadedCheerio('.novel-list-item').each((index, element) => {
      const novelName = loadedCheerio(element).find('.title').text().trim();
      const novelCover = loadedCheerio(element).find('img').attr('src');
      const novelUrl = loadedCheerio(element).find('a').attr('href');

      if (novelUrl) {
        novels.push({
          name: novelName,
          cover: novelCover,
          path: novelUrl,
        });
      }
    });

    return novels;
  }

  // 可以在這裡繼續實作其他必要方法，如 fetchImage 等
}

// 關鍵：必須將類別實體化並匯出，APP 才能讀取到此 Plugin
export default new MyNovelSite();
