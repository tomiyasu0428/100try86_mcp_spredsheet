# Google Sheets MCP

Google SheetsをModel Context Protocol (MCP)を通じて操作するためのサーバーです。
自然言語でGoogle Sheetsの操作が可能になります。

## 機能

- スプレッドシートの一覧表示と作成
- シートの作成、コピー、名前変更
- データの読み取りと書き込み
- 行と列の追加
- 複数範囲の一括更新

## セットアップ

1. **依存関係のインストール**
```bash
npm install
```

2. **Google Cloud Consoleでの設定**
- [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
- Google Sheets APIとGoogle Drive APIを有効化
- OAuth 2.0クライアントIDを作成
- 認証情報（credentials.json）をダウンロード

3. **環境設定**
- `credentials.json`をプロジェクトルートに配置
- `.env`ファイルを作成（必要に応じて）

4. **サーバーの起動**
```bash
npm run dev
```

## 使用方法

### MCPクライアント（Cursor等）での設定

`mcp.config.json`に以下を追加：

```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "npx",
      "args": [
        "tsx",
        "【プロジェクトのパス】/src/index.ts"
      ],
      "env": {}
    }
  }
}
```

### 利用可能なコマンド

1. **スプレッドシート操作**
```typescript
// スプレッドシート一覧の取得
list_spreadsheets

// 新規スプレッドシート作成
create_spreadsheet title="新しいスプレッドシート"

// シート一覧の取得
list_sheets spreadsheet_id="スプレッドシートID"
```

2. **データ操作**
```typescript
// データの読み取り
get_sheet_data spreadsheet_id="スプレッドシートID" sheet="Sheet1" range="A1:D10"

// データの書き込み
update_cells spreadsheet_id="スプレッドシートID" sheet="Sheet1" range="A1:B2" data=[["値1", "値2"], ["値3", "値4"]]

// 複数範囲の一括更新
batch_update_cells spreadsheet_id="スプレッドシートID" sheet="Sheet1" ranges={
  "A1:B1": [["ヘッダー1", "ヘッダー2"]],
  "A2:B2": [["データ1", "データ2"]]
}
```

3. **シート操作**
```typescript
// 新規シート作成
create_sheet spreadsheet_id="スプレッドシートID" title="新しいシート"

// 行の追加
add_rows spreadsheet_id="スプレッドシートID" sheet="Sheet1" num_rows=5

// 列の追加
add_columns spreadsheet_id="スプレッドシートID" sheet="Sheet1" num_columns=3

// シートのコピー
copy_sheet spreadsheet_id="スプレッドシートID" source_sheet="Sheet1" destination_sheet="コピー"

// シート名の変更
rename_sheet spreadsheet_id="スプレッドシートID" old_name="Sheet1" new_name="新しい名前"
```

## トラブルシューティング

- 認証エラーが発生した場合は、`token.json`を削除して再認証を試みてください
- APIの制限に関するエラーが発生した場合は、Google Cloud Consoleで制限を確認してください

## ライセンス

ISC

## 作者

[Your Name]