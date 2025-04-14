import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  // Google API設定
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ],
  CREDENTIALS_PATH: path.resolve(__dirname, '../credentials.json'),
  TOKEN_PATH: path.resolve(__dirname, '../token.json'),
  
  // 認証サーバー設定
  AUTH_PORT: 3000,
  REDIRECT_URI: 'http://localhost:3000/callback',
  
  // ログ設定
  LOG_TO_STDERR: true
};

// ログユーティリティ
export function log(message: string): void {
  if (CONFIG.LOG_TO_STDERR) {
    process.stderr.write(`${message}\n`);
  }
}
