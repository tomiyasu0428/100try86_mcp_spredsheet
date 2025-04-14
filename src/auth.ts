import fs from 'fs/promises';
import http from 'http';
import { google } from 'googleapis';
import { CONFIG, log } from './config.js';

/**
 * Google API認証のためのヘルパー関数
 */
export async function authorize() {
  try {
    // credential.jsonを読み込む
    let credentials;
    try {
      const content = await fs.readFile(CONFIG.CREDENTIALS_PATH, 'utf-8');
      credentials = JSON.parse(content);
    } catch (error) {
      log(`Error loading credentials file: ${error}`);
      log('Make sure to create a credentials.json file from the Google Cloud Console');
      throw error;
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, CONFIG.REDIRECT_URI
    );

    // トークンが存在するか確認
    try {
      const token = await fs.readFile(CONFIG.TOKEN_PATH, 'utf-8');
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    } catch (error) {
      // トークンがない場合、新しい認証を行う
      return await getNewToken(oAuth2Client);
    }
  } catch (error) {
    log(`Authorization failed: ${error}`);
    throw error;
  }
}

/**
 * 新しい認証トークンを取得する
 */
async function getNewToken(oAuth2Client) {
  // 認証URLを生成
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: CONFIG.SCOPES,
  });

  log(`認証が必要です。以下のURLをブラウザで開いてください：\n${authUrl}`);

  // ローカルサーバーを起動して認証コードを受け取る
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        // URLからコードを抽出
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const code = url.searchParams.get('code');

        if (code && url.pathname === '/callback') {
          // レスポンスページを表示
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('認証が完了しました。このウィンドウを閉じて、アプリケーションに戻ってください。');

          // サーバーを停止
          server.close();

          try {
            // コードをトークンに交換
            const { tokens } = await oAuth2Client.getToken(code);
            
            // クライアントにトークンを設定
            oAuth2Client.setCredentials(tokens);
            
            // トークンを保存
            await fs.writeFile(CONFIG.TOKEN_PATH, JSON.stringify(tokens));
            log('トークンが保存されました');
            
            resolve(oAuth2Client);
          } catch (error) {
            reject(`トークンの取得に失敗しました: ${error}`);
          }
        } else {
          // 無効なリクエスト
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('無効なリクエストです');
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`エラーが発生しました: ${error}`);
        reject(error);
      }
    });

    // サーバーを指定されたポートで起動
    server.listen(CONFIG.AUTH_PORT, () => {
      log(`認証サーバーが起動しました。ポート: ${CONFIG.AUTH_PORT}`);
    });

    // エラーハンドリング
    server.on('error', (error) => {
      log(`サーバーエラー: ${error}`);
      reject(error);
    });
  });
}
