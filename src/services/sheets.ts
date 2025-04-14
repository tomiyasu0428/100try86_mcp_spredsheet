import { google } from 'googleapis';
import { authorize } from '../auth.js';
import { log } from '../config.js';

// Google Sheets API インスタンスを取得
async function getSheetsApi() {
  try {
    const auth = await authorize();
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    log(`Failed to get Sheets API: ${error}`);
    throw error;
  }
}

// Google Drive API インスタンスを取得
async function getDriveApi() {
  try {
    const auth = await authorize();
    return google.drive({ version: 'v3', auth });
  } catch (error) {
    log(`Failed to get Drive API: ${error}`);
    throw error;
  }
}

/**
 * スプレッドシートのデータを取得
 */
export async function getSheetData(spreadsheetId: string, sheet: string, range?: string) {
  try {
    const sheets = await getSheetsApi();
    
    // 範囲が指定されていない場合は、シート全体を取得
    const fullRange = range ? `${sheet}!${range}` : sheet;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
    });
    
    return response.data.values || [];
  } catch (error) {
    log(`Error getting sheet data: ${error}`);
    throw error;
  }
}

/**
 * スプレッドシートのセルを更新
 */
export async function updateCells(spreadsheetId: string, sheet: string, range: string, data: any[][]) {
  try {
    const sheets = await getSheetsApi();
    
    const fullRange = `${sheet}!${range}`;
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: fullRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: data,
      },
    });
    
    return {
      updatedRange: response.data.updatedRange,
      updatedCells: response.data.updatedCells,
    };
  } catch (error) {
    log(`Error updating cells: ${error}`);
    throw error;
  }
}

/**
 * 一括でセルを更新
 */
export async function batchUpdateCells(
  spreadsheetId: string, 
  sheet: string, 
  ranges: Record<string, any[][]>
) {
  try {
    const sheets = await getSheetsApi();
    
    const data = Object.entries(ranges).map(([range, values]) => ({
      range: `${sheet}!${range}`,
      values,
    }));
    
    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });
    
    return {
      totalUpdatedCells: response.data.totalUpdatedCells,
      totalUpdatedSheets: response.data.totalUpdatedSheets,
    };
  } catch (error) {
    log(`Error batch updating cells: ${error}`);
    throw error;
  }
}

/**
 * シートの一覧を取得
 */
export async function listSheets(spreadsheetId: string) {
  try {
    const sheets = await getSheetsApi();
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    
    return response.data.sheets?.map(sheet => sheet.properties?.title) || [];
  } catch (error) {
    log(`Error listing sheets: ${error}`);
    throw error;
  }
}

/**
 * スプレッドシートの一覧を取得
 */
export async function listSpreadsheets() {
  try {
    const drive = await getDriveApi();
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
    });
    
    return response.data.files || [];
  } catch (error) {
    log(`Error listing spreadsheets: ${error}`);
    throw error;
  }
}

/**
 * 新しいスプレッドシートを作成
 */
export async function createSpreadsheet(title: string) {
  try {
    const sheets = await getSheetsApi();
    
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });
    
    return {
      spreadsheetId: response.data.spreadsheetId,
      spreadsheetUrl: response.data.spreadsheetUrl,
    };
  } catch (error) {
    log(`Error creating spreadsheet: ${error}`);
    throw error;
  }
}

/**
 * 新しいシートを作成
 */
export async function createSheet(spreadsheetId: string, title: string) {
  try {
    const sheets = await getSheetsApi();
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title,
              },
            },
          },
        ],
      },
    });
    
    return response.data.replies?.[0].addSheet?.properties || {};
  } catch (error) {
    log(`Error creating sheet: ${error}`);
    throw error;
  }
}

/**
 * 行を追加
 */
export async function addRows(spreadsheetId: string, sheet: string, numRows: number) {
  try {
    const sheets = await getSheetsApi();
    
    // シートの情報を取得して、最後の行のインデックスを特定
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    
    const sheetInfo = response.data.sheets?.find(s => s.properties?.title === sheet);
    if (!sheetInfo || !sheetInfo.properties) {
      throw new Error(`Sheet "${sheet}" not found`);
    }
    
    const lastRow = sheetInfo.properties.gridProperties?.rowCount || 0;
    
    // 行を追加
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            appendDimension: {
              sheetId: sheetInfo.properties.sheetId,
              dimension: 'ROWS',
              length: numRows,
            },
          },
        ],
      },
    });
    
    return {
      addedRows: numRows,
      newRowCount: lastRow + numRows,
    };
  } catch (error) {
    log(`Error adding rows: ${error}`);
    throw error;
  }
}

/**
 * 列を追加
 */
export async function addColumns(spreadsheetId: string, sheet: string, numColumns: number) {
  try {
    const sheets = await getSheetsApi();
    
    // シートの情報を取得して、最後の列のインデックスを特定
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    
    const sheetInfo = response.data.sheets?.find(s => s.properties?.title === sheet);
    if (!sheetInfo || !sheetInfo.properties) {
      throw new Error(`Sheet "${sheet}" not found`);
    }
    
    const lastColumn = sheetInfo.properties.gridProperties?.columnCount || 0;
    
    // 列を追加
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            appendDimension: {
              sheetId: sheetInfo.properties.sheetId,
              dimension: 'COLUMNS',
              length: numColumns,
            },
          },
        ],
      },
    });
    
    return {
      addedColumns: numColumns,
      newColumnCount: lastColumn + numColumns,
    };
  } catch (error) {
    log(`Error adding columns: ${error}`);
    throw error;
  }
}

/**
 * シートをコピー
 */
export async function copySheet(
  spreadsheetId: string, 
  sourceSheetName: string, 
  destinationSheetName: string
) {
  try {
    const sheets = await getSheetsApi();
    
    // シートの情報を取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    
    const sourceSheet = response.data.sheets?.find(s => s.properties?.title === sourceSheetName);
    if (!sourceSheet || !sourceSheet.properties || !sourceSheet.properties.sheetId) {
      throw new Error(`Source sheet "${sourceSheetName}" not found`);
    }
    
    // シートをコピー
    const copyResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: sourceSheet.properties.sheetId,
              newSheetName: destinationSheetName,
            },
          },
        ],
      },
    });
    
    return copyResponse.data.replies?.[0].duplicateSheet?.properties || {};
  } catch (error) {
    log(`Error copying sheet: ${error}`);
    throw error;
  }
}

/**
 * シートをリネーム
 */
export async function renameSheet(spreadsheetId: string, oldName: string, newName: string) {
  try {
    const sheets = await getSheetsApi();
    
    // シートの情報を取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    
    const sheet = response.data.sheets?.find(s => s.properties?.title === oldName);
    if (!sheet || !sheet.properties || !sheet.properties.sheetId) {
      throw new Error(`Sheet "${oldName}" not found`);
    }
    
    // シートをリネーム
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: sheet.properties.sheetId,
                title: newName,
              },
              fields: 'title',
            },
          },
        ],
      },
    });
    
    return {
      oldName,
      newName,
    };
  } catch (error) {
    log(`Error renaming sheet: ${error}`);
    throw error;
  }
}
