このドキュメントでは、Google Calendar API を利用した MCP サーバーの実装方法、発生した問題とその解決策について説明します。


## 1. 概要


このMCPサーバーは、Google Calendar API を使用してカレンダーイベントの取得、作成、更新、削除などの操作を行うためのインターフェースを提供します。OAuth 2.0 認証を使用して Google API にアクセスし、Claude Desktop などの AI アシスタントからカレンダー情報にアクセスできるようにします。


## 2. 実装の主要コンポーネント


### 2.1 ファイル構成


```
calendar-mcp/
├── docs/                      # ドキュメント
├── src/
│   ├── auth.ts                # 認証ヘルパー関数
│   ├── config.ts              # 設定情報
│   ├── index.ts               # メインエントリーポイント
│   ├── server.ts              # Express サーバー（認証用）
│   └── services/
│       └── calendar.ts        # Google Calendar API 操作
├── token.json                 # 認証トークン（自動生成）
├── package.json               # 依存関係
└── tsconfig.json              # TypeScript 設定
```


### 2.2 主要機能


1. **認証処理**：OAuth 2.0 を使用した Google API 認証
2. **カレンダーイベント操作**：イベントの取得、作成、更新、削除
3. **空き時間検索**：指定期間内の空き時間スロットを検索
4. **トークン管理**：アクセストークンの自動更新と保存


## 3. FastMCP の使用方法


FastMCP は MCP サーバーを簡単に作成するためのライブラリです。このプロジェクトでは FastMCP を使用して、Google Calendar API と連携する MCP サーバーを実装しています。


### 3.1 FastMCP のセットアップ


```typescript
import { FastMCP } from 'fastmcp';
import { z } from 'zod'; // スキーマ検証用


// MCPサーバーのインスタンスを作成
const server = new FastMCP({
 name: 'CalendarAssistant',
 version: '1.0.0',
});
```


### 3.2 ツールの定義


FastMCP では、`addTool` メソッドを使用して AI アシスタントが利用できるツールを定義します。各ツールには以下の要素が必要です：


1. **name**: ツールの名前
2. **description**: ツールの説明
3. **parameters**: Zod スキーマを使用したパラメータの定義
4. **execute**: ツールの実行ロジック


```typescript
// カレンダーイベントを取得するツールの例
server.addTool({
 name: 'getEvents',
 description: '指定した期間のカレンダーイベントを取得します',
 parameters: z.object({
   startDate: z.string().describe('開始日（YYYY-MM-DD形式）'),
   endDate: z.string().describe('終了日（YYYY-MM-DD形式）'),
 }),
 execute: async (args) => {
   try {
     const events = await getEvents(args.startDate, args.endDate);
    
     // イベントの整形（クライアントに表示しやすい形に）
     const formattedEvents = events.map(event => ({
       id: event.id,
       title: event.summary,
       start: event.start?.dateTime || event.start?.date,
       end: event.end?.dateTime || event.end?.date,
       location: event.location,
       description: event.description,
     }));
    
     return JSON.stringify(formattedEvents, null, 2);
   } catch (error) {
     return `エラーが発生しました: ${error}`;
   }
 },
});
```


### 3.3 サーバーの起動


FastMCP サーバーを起動するには、`start` メソッドを呼び出します。Claude Desktop との互換性のために、標準出力にはログを出力せず、JSONRPC 通信専用に確保します。


```typescript
// サーバーを起動
server.start({
 log: (message) => {
   // 標準出力にログを出力しないようにする
   // 標準出力はJSONRPC通信専用
   process.stderr.write(`${message}\n`);
 },
});


// ログメッセージを出力
log('Calendar MCP サーバーが起動しました');
```


### 3.4 FastMCP の特徴と利点


1. **型安全性**:
  - Zod スキーマを使用したパラメータの検証
  - TypeScript の型推論によるエラー防止


2. **簡潔な API**:
  - 少ないコードでツールを定義可能
  - 直感的なインターフェース


3. **エラーハンドリング**:
  - ツール実行時のエラーを適切に処理
  - クライアントへのエラーメッセージの伝達


4. **ログ管理**:
  - カスタマイズ可能なログ出力
  - Claude Desktop との互換性確保


## 4. 発生した問題と解決策


### 4.1 認証関連の問題


#### 問題1: リダイレクトURI不一致エラー


**問題の詳細**:
Google Cloud Console で設定したリダイレクトURI と、コード内で指定したリダイレクトURI が一致しないため、`redirect_uri_mismatch` エラーが発生しました。


**解決策**:
`config.ts` ファイル内のリダイレクトURIを、Google Cloud Console で設定した値と完全に一致するように修正しました。


```typescript
// 修正前
redirect_uri: 'http://localhost:3000/callback'


// 修正後
redirect_uri: 'http://localhost:8787/callback'
```


#### 問題2: トークンファイルのパス解決エラー


**問題の詳細**:
相対パスでトークンファイルを指定していたため、実行ディレクトリによってはファイルが見つからず、毎回認証を求められる問題が発生しました。


**解決策**:
トークンファイルのパスを絶対パスに変更しました。


```typescript
// 修正前
export const TOKEN_PATH = './token.json';


// 修正後
import path from 'path';
export const TOKEN_PATH = path.resolve(__dirname, '../token.json');
```


### 4.2 ログ出力の問題


#### 問題: Claude Desktop との互換性


**問題の詳細**:
標準出力（stdout）にログを出力していたため、JSONRPC 通信を使用する Claude Desktop との互換性に問題が発生しました。


**解決策**:
すべてのログメッセージを標準エラー出力（stderr）に出力するように変更しました。


```typescript
// 修正前
console.log('メッセージ');
console.error('エラーメッセージ');


// 修正後
function log(message: string) {
 process.stderr.write(`${message}\n`);
}


log('メッセージ');
log('エラーメッセージ');
```


### 4.3 サーバー起動の問題


#### 問題: ポート競合


**問題の詳細**:
認証サーバーを起動する際に、既に同じポート（8787）が使用されていると警告が表示されました。


**解決策**:
この警告は無視して問題ありません。既に認証が完了している場合は、サーバーが起動していなくても機能します。ただし、必要に応じて以下の対策が可能です：


1. 使用するポートを変更する
2. 起動前に既存のサーバープロセスを終了する


### 4.4 FastMCP 関連の問題


#### 問題: クライアント機能の推論エラー


**問題の詳細**:
サーバー起動時に `FastMCP could not infer client capabilities` という警告が表示されることがあります。


**解決策**:
この警告は通常の動作に影響しないため無視して問題ありません。必要に応じて、クライアント機能を明示的に指定することも可能です：


```typescript
server.start({
 clientCapabilities: {
   // クライアント機能を明示的に指定
 },
 log: (message) => {
   process.stderr.write(`${message}\n`);
 },
});
```


## 5. 実装のベストプラクティス


### 5.1 認証フロー


1. **自動認証処理**:
  - Web サーバーを使用して認証コールバックを自動的に処理
  - 手動でのコード入力が不要


2. **トークン管理**:
  - トークンを安全に保存
  - リフレッシュトークンを使用した自動更新
  - トークンの有効期限チェック


### 5.2 エラーハンドリング


1. **詳細なエラーメッセージ**:
  - エラーの種類と詳細を明確に表示
  - 適切な解決策を提案


2. **標準エラー出力の使用**:
  - すべてのログを `process.stderr.write()` に出力
  - JSONRPC 通信との分離


### 5.3 設定管理


1. **環境変数の使用**:
  - 機密情報は環境変数で管理（理想的には）
  - 設定は一箇所にまとめる


2. **絶対パスの使用**:
  - ファイルパスは絶対パスで指定
  - 実行ディレクトリに依存しない設計


### 5.4 FastMCP の効果的な使用


1. **ツール設計**:
  - 明確な名前と説明
  - 適切なパラメータ検証
  - 詳細なエラーメッセージ


2. **応答フォーマット**:
  - クライアントが解析しやすい JSON 形式
  - 人間が読みやすい整形


3. **モジュール化**:
  - 関連する機能をサービスとして分離
  - ツールは薄いラッパーとして実装


## 6. Claude Desktop との連携


### 6.1 設定方法


Claude Desktop の MCP サーバー設定:


- **名前**: Calendar Assistant
- **コマンド**: npx
- **引数**: tsx /Users/[ユーザー名]/Desktop/MCPサーバー/calendar-mcp/src/index.ts


### 6.2 注意点


1. **標準出力の使用制限**:
  - JSONRPC 通信のために標準出力を確保
  - すべてのログは標準エラー出力に出力


2. **認証プロセス**:
  - 初回のみブラウザでの認証が必要
  - トークンは自動的に保存・更新


## 7. まとめ


Google Calendar API を使用した MCP サーバーの実装では、OAuth 認証、トークン管理、ログ出力の適切な処理が重要です。特に Claude Desktop との連携においては、標準出力と標準エラー出力の使い分けが必須となります。


FastMCP を使用することで、MCP サーバーの実装が大幅に簡略化され、型安全性やエラーハンドリングが向上します。Zod スキーマを活用したパラメータ検証により、クライアントからの入力エラーを事前に防ぐことができます。


また、ファイルパスの指定には絶対パスを使用し、実行環境に依存しない堅牢な設計を心がけましょう。認証情報の管理にも十分注意し、セキュリティを確保することが重要です。
