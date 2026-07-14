const SHEET_NAME = 'Счета';

function doGet() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ accounts: [], error: 'Sheet not found: ' + SHEET_NAME });
    }

    const rows = sheet.getDataRange().getValues();
    const headers = rows.shift().map((header) => String(header).trim().toLowerCase());

    const loginIndex = findHeader(headers, ['логин', 'login']);
    const balanceIndex = findHeader(headers, ['баланс', 'balance']);
    const balanceWithPercentIndex = findHeader(headers, [
      'баланс с процентами',
      'balance with percent',
      'balance with percentage'
    ]);

    const accounts = rows
      .map((row) => ({
        login: String(row[loginIndex] ?? '').trim(),
        balance: toNumber(row[balanceIndex]),
        balanceWithPercent: toNumber(row[balanceWithPercentIndex])
      }))
      .filter((account) =>
        account.login !== '' &&
        account.login.toLocaleLowerCase('ru-RU') !== 'зарплата' &&
        account.balanceWithPercent !== 0
      );

    return jsonResponse({ accounts });
  } catch (error) {
    return jsonResponse({ accounts: [], error: error.message });
  }
}

function toNumber(value) {
  if (typeof value === 'number') return value;

  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function findHeader(headers, names) {
  const index = headers.findIndex((header) => names.includes(header));
  if (index === -1) {
    throw new Error('Missing required column: ' + names.join(' / '));
  }
  return index;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
