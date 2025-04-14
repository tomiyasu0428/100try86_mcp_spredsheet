import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { log } from './config.js';
import {
  getSheetData,
  updateCells,
  batchUpdateCells,
  listSheets,
  listSpreadsheets,
  createSpreadsheet,
  createSheet,
  addRows,
  addColumns,
  copySheet,
  renameSheet
} from './services/sheets.js';
import { authorize } from './auth.js';

// MCPサーバーのインスタンスを作成
const server = new FastMCP({
  name: 'Google Sheets Assistant',
  version: '1.0.0',
});

// Google認証を実行
try {
  await authorize();
  log('Google認証が完了しました');
} catch (error) {
  log(`Google認証に失敗しました: ${error}`);
  process.exit(1);
}

// 1. get_sheet_data - スプレッドシートからデータを取得するツール
server.addTool({
  name: 'get_sheet_data',
  description: 'Google スプレッドシートの特定のシートからデータを取得する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID（URLの一部）'),
    sheet: z.string().describe('シートの名前'),
    range: z.string().optional().describe('A1表記のセル範囲（例：A1:C10）'),
  }),
  execute: async (args) => {
    try {
      const data = await getSheetData(args.spreadsheet_id, args.sheet, args.range);
      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw new UserError(`シートデータの取得に失敗しました: ${error}`);
    }
  },
});

// 2. update_cells - セルを更新するツール
server.addTool({
  name: 'update_cells',
  description: 'Google スプレッドシートのセルを更新する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    sheet: z.string().describe('シートの名前'),
    range: z.string().describe('A1表記のセル範囲'),
    data: z.array(z.array(z.any())).describe('更新する値の2次元配列'),
  }),
  execute: async (args) => {
    try {
      const result = await updateCells(args.spreadsheet_id, args.sheet, args.range, args.data);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`セルの更新に失敗しました: ${error}`);
    }
  },
});

// 3. batch_update_cells - 複数の範囲を一括更新するツール
server.addTool({
  name: 'batch_update_cells',
  description: 'Google スプレッドシートの複数の範囲を一括更新する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    sheet: z.string().describe('シートの名前'),
    ranges: z.record(z.string(), z.array(z.array(z.any())))
      .describe('範囲文字列（A1:B2）をキーとする、更新データの2次元配列の辞書'),
  }),
  execute: async (args) => {
    try {
      const result = await batchUpdateCells(args.spreadsheet_id, args.sheet, args.ranges);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`一括更新に失敗しました: ${error}`);
    }
  },
});

// 4. list_sheets - スプレッドシートのシート一覧を取得するツール
server.addTool({
  name: 'list_sheets',
  description: 'Google スプレッドシートのすべてのシートを一覧表示する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
  }),
  execute: async (args) => {
    try {
      const sheets = await listSheets(args.spreadsheet_id);
      return JSON.stringify(sheets, null, 2);
    } catch (error) {
      throw new UserError(`シート一覧の取得に失敗しました: ${error}`);
    }
  },
});

// 5. list_spreadsheets - スプレッドシート一覧を取得するツール
server.addTool({
  name: 'list_spreadsheets',
  description: 'Googleドライブ上のすべてのスプレッドシートを一覧表示する',
  parameters: z.object({}),
  execute: async () => {
    try {
      const spreadsheets = await listSpreadsheets();
      return JSON.stringify(spreadsheets, null, 2);
    } catch (error) {
      throw new UserError(`スプレッドシート一覧の取得に失敗しました: ${error}`);
    }
  },
});

// 6. create_spreadsheet - 新しいスプレッドシートを作成するツール
server.addTool({
  name: 'create_spreadsheet',
  description: '新しいGoogleスプレッドシートを作成する',
  parameters: z.object({
    title: z.string().describe('新しいスプレッドシートのタイトル'),
  }),
  execute: async (args) => {
    try {
      const result = await createSpreadsheet(args.title);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`スプレッドシートの作成に失敗しました: ${error}`);
    }
  },
});

// 7. create_sheet - 新しいシートを作成するツール
server.addTool({
  name: 'create_sheet',
  description: '既存のGoogleスプレッドシートに新しいシートタブを作成する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    title: z.string().describe('新しいシートのタイトル'),
  }),
  execute: async (args) => {
    try {
      const result = await createSheet(args.spreadsheet_id, args.title);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`シートの作成に失敗しました: ${error}`);
    }
  },
});

// 8. add_rows - 行を追加するツール
server.addTool({
  name: 'add_rows',
  description: 'スプレッドシートに行を追加する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    sheet: z.string().describe('シートの名前'),
    num_rows: z.number().min(1).describe('追加する行数'),
  }),
  execute: async (args) => {
    try {
      const result = await addRows(args.spreadsheet_id, args.sheet, args.num_rows);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`行の追加に失敗しました: ${error}`);
    }
  },
});

// 9. add_columns - 列を追加するツール
server.addTool({
  name: 'add_columns',
  description: 'スプレッドシートに列を追加する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    sheet: z.string().describe('シートの名前'),
    num_columns: z.number().min(1).describe('追加する列数'),
  }),
  execute: async (args) => {
    try {
      const result = await addColumns(args.spreadsheet_id, args.sheet, args.num_columns);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`列の追加に失敗しました: ${error}`);
    }
  },
});

// 10. copy_sheet - シートをコピーするツール
server.addTool({
  name: 'copy_sheet',
  description: 'スプレッドシート内でシートをコピーする',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    source_sheet: z.string().describe('コピー元のシート名'),
    destination_sheet: z.string().describe('コピー先の新しいシート名'),
  }),
  execute: async (args) => {
    try {
      const result = await copySheet(
        args.spreadsheet_id, 
        args.source_sheet, 
        args.destination_sheet
      );
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`シートのコピーに失敗しました: ${error}`);
    }
  },
});

// 11. rename_sheet - シートをリネームするツール
server.addTool({
  name: 'rename_sheet',
  description: 'スプレッドシートのシート名を変更する',
  parameters: z.object({
    spreadsheet_id: z.string().describe('スプレッドシートのID'),
    old_name: z.string().describe('現在のシート名'),
    new_name: z.string().describe('新しいシート名'),
  }),
  execute: async (args) => {
    try {
      const result = await renameSheet(
        args.spreadsheet_id, 
        args.old_name, 
        args.new_name
      );
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new UserError(`シート名の変更に失敗しました: ${error}`);
    }
  },
});

// サーバーの起動
log('Google Sheets MCP サーバーを起動しています...');
server.start({
  transportType: 'stdio',
});
log('Google Sheets MCP サーバーが起動しました');