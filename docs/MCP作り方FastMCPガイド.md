TypeScript で MCP サーバーを構築するガイド
TypeScript版の FastMCP を使用して、Model Context Protocol (MCP) サーバーを構築する方法をご紹介します。このドキュメントでは、セットアップから基本的な実装、デプロイまでのステップを解説します。
目次
MCPとは
環境準備
プロジェクトのセットアップ
基本的なサーバーの実装
発展的な機能
デプロイと統合
実装例：カレンダーMCPサーバー
MCPとは
Model Context Protocol (MCP) は、AIモデル（Claude等）が外部ツール、データソース、APIと安全かつ標準化された方法で通信できるようにするオープンプロトコルです。AIモデルは直接データソースにアクセスできませんが、MCPサーバーを通じて様々な外部リソースと対話できるようになります。
MCPは「AIのためのUSB-C」とも称され、異なるAIモデルとツール間の統一的な接続方法を提供します。
環境準備
必要なツール
Node.js (v16以上)
npm または yarn
TypeScript版 FastMCP のインストール
bash
# NPM の場合
npm install fastmcp

# Yarn の場合
yarn add fastmcp
プロジェクトのセットアップ
新しいプロジェクトの作成
bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install fastmcp typescript tsx zod @types/node
npx tsc --init
package.json の設定
json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "@types/node": "^22.0.0",
    "fastmcp": "^1.21.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "zod": "^3.0.0"
  }
}
ディレクトリ構造
my-mcp-server/
├── src/
│   ├── index.ts          # メインのサーバーコード
│   ├── config.ts         # 設定ファイル
│   └── services/         # 外部サービスとの連携
│       └── example.ts    # 例：外部APIとの連携
├── package.json
└── tsconfig.json
基本的なサーバーの実装
最小限のMCPサーバー実装例
typescript
// src/index.ts
import { FastMCP } from "fastmcp";
import { z } from "zod"; // または他の検証ライブラリ

// MCPサーバーのインスタンスを作成
const server = new FastMCP({
  name: "My MCP Server",
  version: "1.0.0",
});

// ツールの追加
server.addTool({
  name: "hello",
  description: "挨拶を返します",
  parameters: z.object({
    name: z.string().describe("挨拶する相手の名前"),
  }),
  execute: async (args) => {
    return `こんにちは、${args.name}さん！`;
  },
});

// サーバーの起動
server.start({
  transportType: "stdio", // 標準入出力を使用
});

console.log('MCP サーバーが起動しました');
サーバーの実行
bash
npm run dev
発展的な機能
1. リソースの定義
リソースはデータを提供するための仕組みです：
typescript
server.addResource({
  uri: "file:///example/data.txt",
  name: "サンプルデータ",
  mimeType: "text/plain",
  async load() {
    return {
      text: "これはサンプルデータです。",
    };
  },
});
2. リソーステンプレート
動的なリソースを定義できます：
typescript
server.addResourceTemplate({
  uriTemplate: "file:///user/{username}",
  name: "ユーザー情報",
  mimeType: "application/json",
  arguments: [
    {
      name: "username",
      description: "ユーザー名",
      required: true,
    },
  ],
  async load({ username }) {
    // ユーザー情報を取得するロジック
    const userData = await fetchUserData(username);
    return {
      text: JSON.stringify(userData),
    };
  },
});
3. プロンプトの定義
再利用可能なプロンプトテンプレートを定義できます：
typescript
server.addPrompt({
  name: "analysis",
  description: "テキスト分析のためのプロンプト",
  arguments: [
    {
      name: "text",
      description: "分析対象のテキスト",
      required: true,
    },
  ],
  load: async (args) => {
    return `以下のテキストを分析し、要点をまとめてください：\n\n${args.text}`;
  },
});
4. 認証の実装
typescript
import { UserError } from "fastmcp";

const server = new FastMCP({
  name: "My Secure Server",
  version: "1.0.0",
  authenticate: ({request}) => {
    const apiKey = request.headers["x-api-key"];
    
    if (apiKey !== 'your-secret-key') {
      throw new Response(null, {
        status: 401,
        statusText: "Unauthorized",
      });
    }
    
    return {
      userId: "user-123",
    };
  },
});
5. ログとプログレス
typescript
server.addTool({
  name: "processData",
  description: "大量のデータを処理します",
  parameters: z.object({
    dataSize: z.number().describe("処理するデータのサイズ"),
  }),
  execute: async (args, { log, reportProgress }) => {
    const totalSteps = args.dataSize;
    
    log.info("データ処理を開始します", { size: args.dataSize });
    
    for (let i = 0; i < totalSteps; i++) {
      // 処理ロジック
      await processingStep(i);
      
      // 進捗報告
      reportProgress({
        progress: i + 1,
        total: totalSteps,
      });
      
      log.debug(`ステップ ${i + 1}/${totalSteps} 完了`);
    }
    
    log.info("データ処理が完了しました");
    
    return "処理が完了しました";
  },
});
6. エラー処理
typescript
import { UserError } from "fastmcp";

server.addTool({
  name: "divide",
  description: "2つの数値を除算します",
  parameters: z.object({
    a: z.number().describe("被除数"),
    b: z.number().describe("除数"),
  }),
  execute: async (args) => {
    if (args.b === 0) {
      throw new UserError("0で除算することはできません");
    }
    
    return String(args.a / args.b);
  },
});
デプロイと統合
1. SSEモードでの実行
Server-Sent Events (SSE) を使用してネットワーク越しに通信する場合：
typescript
server.start({
  transportType: "sse",
  sse: {
    endpoint: "/sse",
    port: 8080,
  },
});
2. Claude デスクトップとの統合
Claude デスクトップを開く
設定 > MCP > 新しいサーバーを追加
設定例：
名前: My MCP Server
タイプ: command
コマンド: npx
引数: tsx /path/to/your/project/src/index.ts
3. テストとデバッグ
FastMCPに同梱されているツールを使用してサーバーをテストできます：
bash
# CLIでテスト
npx fastmcp dev src/index.ts

# インスペクターでテスト
npx fastmcp inspect src/index.ts
実装例：カレンダーMCPサーバー
以下は、Google カレンダーと連携するMCPサーバーのサンプルコードです：
typescript
// src/index.ts
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { getEvents, findFreeSlots, createEvent } from './services/calendar';

const server = new FastMCP({
  name: 'CalendarAssistant',
  version: '1.0.0',
});

// カレンダーイベントを取得するツール
server.addTool({
  name: 'getEvents',
  description: '指定した期間のカレンダーイベントを取得します',
  parameters: z.object({
    startDate: z.string().describe('開始日（YYYY-MM-DD形式）'),
    endDate: z.string().describe('終了日（YYYY-MM-DD形式）'),
  }),
  execute: async (args) => {
    const events = await getEvents(args.startDate, args.endDate);
    return JSON.stringify(events, null, 2);
  },
});

// 空き時間を見つけるツール
server.addTool({
  name: 'findFreeSlots',
  description: 'カレンダーの空き時間を見つけます',
  parameters: z.object({
    startDate: z.string().describe('開始日（YYYY-MM-DD形式）'),
    endDate: z.string().describe('終了日（YYYY-MM-DD形式）'),
    durationMinutes: z.number().min(15).describe('必要な時間（分単位）'),
  }),
  execute: async (args, { log }) => {
    log.info('空き時間を検索中...');
    const freeSlots = await findFreeSlots(
      args.startDate,
      args.endDate,
      args.durationMinutes
    );
    return JSON.stringify(freeSlots, null, 2);
  },
});

// サーバー起動
server.start({
  transportType: 'stdio',
});
まとめ
TypeScript版 FastMCP を使用すると、AIモデルが外部サービスやデータソースと連携するための橋渡しとなるMCPサーバーを簡単に構築できます。このドキュメントで紹介した基本的な機能を応用すれば、様々なユースケースに対応するMCPサーバーを開発することが可能です。
FastMCPの詳細については、公式GitHubを参照してください。
https://github.com/punkpeye/fastmcp
​​実装例2

# FastMCPを使ったMCPサーバーの作り方ガイド


## 目次


1. [はじめに](#はじめに)
2. [環境構築](#環境構築)
3. [基本的なMCPサーバーの作成](#基本的なmcpサーバーの作成)
4. [ツールの追加](#ツールの追加)
5. [エラーハンドリング](#エラーハンドリング)
6. [Claudeとの連携](#claudeとの連携)
7. [トラブルシューティング](#トラブルシューティング)


## はじめに


Model Context Protocol (MCP) は、AIモデルとツールを連携させるための標準プロトコルです。FastMCPは、Node.js環境でMCPサーバーを簡単に構築するためのライブラリです。このガイドでは、FastMCPを使用してMCPサーバーを作成し、Claudeなどのモデルと連携する方法を説明します。


## 環境構築


### 前提条件


- Node.js (v18以上)
- npm または yarn


### プロジェクトのセットアップ


1. 新しいディレクトリを作成します：


```bash
mkdir my-mcp-server
cd my-mcp-server
```


2. プロジェクトを初期化します：


```bash
npm init -y
```


3. 必要なパッケージをインストールします：


```bash
npm install fastmcp zod
npm install --save-dev typescript ts-node @types/node tsx
```


4. TypeScriptの設定ファイルを作成します：


```bash
npx tsc --init
```


5. `tsconfig.json`を編集して、以下の設定を追加します：


```json
{
 "compilerOptions": {
   "target": "ES2022",
   "module": "NodeNext",
   "moduleResolution": "NodeNext",
   "esModuleInterop": true,
   "strict": true,
   "outDir": "./dist"
 },
 "include": ["src/**/*"]
}
```


6. `package.json`にスクリプトを追加します：


```json
"scripts": {
 "dev": "tsx src/index.ts",
 "build": "tsc",
 "start": "node dist/index.js"
}
```


## 基本的なMCPサーバーの作成


### 最小限のMCPサーバー


`src/index.ts`ファイルを作成し、以下のコードを記述します：


```typescript
import { FastMCP } from 'fastmcp';
import { z } from 'zod';


// MCPサーバーの初期化
const server = new FastMCP({
 name: 'My MCP Server',
 version: '1.0.0',
});


// サーバーを起動
server.start({
 transportType: 'stdio',
});
```


これだけで、基本的なMCPサーバーが起動します。ただし、このサーバーはまだ何も機能を持っていません。


## ツールの追加


MCPサーバーの主な機能は「ツール」を通じて提供されます。以下は、簡単なツールを追加する例です：


```typescript
// 簡単な計算ツールを追加
server.addTool({
 name: 'calculate',
 description: '簡単な計算を行います',
 parameters: z.object({
   expression: z.string().describe('計算式（例: 2 + 2）'),
 }),
 execute: async (args) => {
   try {
     // 注意: eval()は本番環境では安全ではありません
     const result = eval(args.expression);
     return `計算結果: ${result}`;
   } catch (error) {
     throw new Error(`計算に失敗しました: ${error}`);
   }
 },
});
```


### パラメータのバリデーション


Zodを使用して、ツールのパラメータを定義およびバリデーションします：


```typescript
parameters: z.object({
 name: z.string().describe('名前'),
 age: z.number().min(0).max(150).describe('年齢'),
 email: z.string().email().optional().describe('メールアドレス（任意）'),
}),
```


## エラーハンドリング


FastMCPでは、`UserError`クラスを使用してユーザーに表示するエラーを定義できます：


```typescript
import { FastMCP, UserError } from 'fastmcp';


// ツール内でのエラーハンドリング
execute: async (args) => {
 try {
   // 何らかの処理
   if (条件) {
     throw new UserError('ユーザーに表示するエラーメッセージ');
   }
   return '成功メッセージ';
 } catch (error) {
   if (error instanceof UserError) {
     throw error; // UserErrorはそのまま再スロー
   }
   // その他のエラーは適切に処理
   throw new UserError(`予期しないエラーが発生しました: ${error}`);
 }
},
```


## Claudeとの連携


### Claude設定ファイルの編集


Claudeアプリケーションと連携するには、Claudeの設定ファイルを編集する必要があります：


1. Claudeアプリケーションの設定ファイル（`claude_desktop_config.json`）を開きます
2. `mcpServers`セクションに新しいサーバー設定を追加します：


```json
"mcpServers": {
 "my-mcp-server": {
   "command": "npx",
   "args": [
     "tsx",
     "/path/to/your/project/src/index.ts"
   ],
   "env": {}
 }
}
```


### 重要な注意点


1. **標準出力の使用**: MCPサーバーでは、標準出力（stdout）と標準入力（stdin）がクライアントとの通信に使用されます。そのため、`console.log()`などを使用して直接標準出力に書き込むと、通信プロトコルが壊れる可能性があります。


2. **JSONフォーマット**: すべての通信はJSON形式で行われます。不正なJSONを出力すると「Unexpected token」などのエラーが発生します。


## トラブルシューティング


### よくあるエラーと解決策


1. **「Unexpected token」エラー**
  - 原因: 標準出力に直接テキストを出力している
  - 解決策: `console.log()`の使用を避け、ログ出力が必要な場合は適切なログファイルに書き込む


2. **「Cannot read properties of undefined」エラー**
  - 原因: 存在しないオブジェクトやメソッドにアクセスしている
  - 解決策: APIドキュメントを確認し、正しいオブジェクト構造を使用する


3. **「EPIPE」エラー**
  - 原因: クライアントとの接続が切断された
  - 解決策: エラーハンドリングを追加し、接続の切断を適切に処理する


### デバッグ方法


1. ファイルにログを出力する：


```typescript
import fs from 'fs';


// ログファイルにデバッグ情報を書き込む
function debugLog(message: string) {
 fs.appendFileSync('/path/to/debug.log', `${new Date().toISOString()}: ${message}\n`);
}


// 使用例
debugLog(`引数: ${JSON.stringify(args)}`);
```


## サンプルアプリケーション: メモアプリ


以下は、メモの作成・取得・更新・削除機能を持つMCPサーバーの完全な例です：


```typescript
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';


// メモを保存するディレクトリパス
const MEMOS_DIR = './memos';


// MCPサーバーの初期化
const server = new FastMCP({
 name: 'Memo MCP Server',
 version: '1.0.0',
});


// ディレクトリが存在することを確認する関数
async function ensureDirectory() {
 try {
   await fs.access(MEMOS_DIR);
 } catch (error) {
   // ディレクトリが存在しない場合は作成
   await fs.mkdir(MEMOS_DIR, { recursive: true });
 }
}


// メモのファイル名を生成する関数
function getMemoFilePath(title: string): string {
 // タイトルをファイル名に適した形式に変換
 const safeName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
 return path.join(MEMOS_DIR, `${safeName}.txt`);
}


// 1. メモ作成ツール
server.addTool({
 name: 'createMemo',
 description: '新しいメモを作成します',
 parameters: z.object({
   title: z.string().describe('メモのタイトル'),
   content: z.string().describe('メモの内容'),
 }),
 execute: async (args) => {
   await ensureDirectory();
  
   const filePath = getMemoFilePath(args.title);
  
   try {
     // ファイルが既に存在するかチェック
     try {
       await fs.access(filePath);
       throw new UserError(`"${args.title}" というタイトルのメモは既に存在します。`);
     } catch (error) {
       // ファイルが存在しない場合は問題ない（続行）
       if (!(error instanceof UserError)) {
         // メモを書き込み
         await fs.writeFile(filePath, args.content, 'utf-8');
         return `"${args.title}" というタイトルのメモを作成しました。`;
       }
       throw error;
     }
   } catch (error) {
     if (error instanceof UserError) {
       throw error;
     }
     throw new UserError(`メモの作成に失敗しました: ${error}`);
   }
 },
});


// 他のツール（getMemo, updateMemo, deleteMemo, listMemos）も同様に実装...


// サーバーを起動
server.start({
 transportType: 'stdio',
});
```


このガイドが、FastMCPを使ったMCPサーバーの開発に役立つことを願っています。さらに詳しい情報は、[FastMCP公式ドキュメント](https://github.com/fastmcp/fastmcp)を参照してください。