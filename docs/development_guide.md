# Google Sheets MCP 開発ガイド

## 開発プロセス

### 1. プロジェクトの初期設定

1. **プロジェクトの作成**
```bash
mkdir google-sheets-mcp
cd google-sheets-mcp
npm init -y
```

2. **必要なパッケージのインストール**
```bash
npm install fastmcp googleapis zod
npm install -D typescript tsx @types/node
```

3. **TypeScript設定**
```bash
# tsconfig.json の作成
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist"
  }
}
```

### 2. Google Cloud Platform設定

1. **プロジェクト作成**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - 新規プロジェクト作成
   - プロジェクト名を設定（例：`Google Sheets MCP`）

2. **API有効化**
   - Google Sheets API
   - Google Drive API

3. **認証設定**
   - OAuth同意画面の設定
   - OAuth 2.0クライアントIDの作成
   - 認証情報のダウンロード

### 3. MCPサーバー実装

1. **基本構造**
```
src/
  ├── index.ts      # メインサーバーファイル
  ├── config.ts     # 設定
  ├── auth.ts       # 認証処理
  └── services/     # 各種サービス
      └── sheets.ts # スプレッドシート操作
```

2. **実装順序**
   1. 認証機能
   2. 基本的なスプレッドシート操作
   3. 高度な機能
   4. エラーハンドリング
   5. ログ機能

## エラー対処ガイド

### 1. 認証関連のエラー

#### OAuth認証エラー
```
Error: invalid_client
```
**対処方法**:
1. `credentials.json`の内容を確認
2. クライアントIDとシークレットが正しいか確認
3. 承認済みのリダイレクトURIを確認
4. OAuth同意画面の設定を確認

#### トークンエラー
```
Error: invalid_grant
```
**対処方法**:
1. `token.json`を削除
2. サーバーを再起動して再認証
3. OAuth同意画面でのスコープを確認

### 2. API関連のエラー

#### レート制限
```
Error: Quota exceeded for quota metric 'Read requests'
```
**対処方法**:
1. Google Cloud Consoleでクォータを確認
2. 必要に応じてクォータの引き上げを申請
3. リクエストの頻度を調整

#### アクセス権限
```
Error: Insufficient permissions
```
**対処方法**:
1. スコープの設定を確認
2. ファイルの共有設定を確認
3. OAuth同意画面での権限を確認

### 3. 実装関連のエラー

#### TypeScriptコンパイルエラー
**対処方法**:
1. `tsconfig.json`の設定を確認
2. 型定義の問題を修正
3. 必要な`@types`パッケージをインストール

#### MCPツールのエラー
**対処方法**:
1. パラメータの型を確認
2. エラーハンドリングを適切に実装
3. レスポンスのフォーマットを確認

## ベストプラクティス

1. **エラーハンドリング**
   - すべてのAPI呼び出しをtry-catchで囲む
   - ユーザーフレンドリーなエラーメッセージを返す
   - エラーログを適切に記録

2. **認証管理**
   - 認証情報を安全に保管
   - トークンの自動更新を実装
   - エラー時の再認証フローを整備

3. **パフォーマンス**
   - バッチ更新を活用
   - 適切なキャッシュ戦略
   - リクエスト数の最適化

4. **セキュリティ**
   - 環境変数での機密情報管理
   - 適切なスコープの使用
   - アクセス権限の最小化

## デバッグとテスト

1. **ログの活用**
```typescript
log('操作開始: ' + operation);
try {
  // 操作実行
  log('操作成功');
} catch (error) {
  log('エラー発生: ' + error);
}
```

2. **テスト方法**
   - 単体テストの作成
   - 統合テストの実施
   - エラーケースのテスト

3. **デバッグツール**
   - VSCodeデバッガーの使用
   - ログ出力の活用
   - Google Cloud Consoleの監視ツール