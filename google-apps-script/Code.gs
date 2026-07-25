/**
 * Single-day extraction endpoint for cumulative Google Docs / Sheets.
 *
 * DEPLOYMENT (one-time, free, no billing account required):
 * 1. Go to https://script.google.com/ and create a new project, signed in
 *    with the SAME Google account that owns/has edit access to the master
 *    Docs & Sheets (the docs.google.com/... links pasted into the Team Portal).
 * 2. Delete the default Code.gs content and paste this whole file in.
 * 3. Click the "+" next to Files, add a new file named "appsscript.json"
 *    (or open Project Settings > "Show appsscript.json in editor"), and
 *    replace its contents with the appsscript.json file next to this one.
 * 4. Deploy > New deployment > select type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Authorize the requested scopes (Docs, Sheets, Drive) when prompted.
 * 6. Copy the resulting "/exec" Web app URL and set it as
 *    VITE_APPS_SCRIPT_EXPORT_URL in this project's .env file.
 *
 * Every time you edit this script, create a NEW deployment version
 * (Deploy > Manage deployments > Edit > New version) for changes to go live.
 */

function doGet(e) {
  var mode = (e && e.parameter && e.parameter.mode) || 'download'; // 'download' or 'preview'
  try {
    var docId = e.parameter.docId;
    var type = e.parameter.type; // 'doc' or 'sheet'
    var dateIso = e.parameter.date; // 'YYYY-MM-DD'
    var client = e.parameter.client || 'Client';
    var docType = e.parameter.docType || 'Report';

    if (!docId || !dateIso) {
      var missingMsg = 'Missing required parameters: docId and date.';
      return mode === 'preview' ? jsonOutput({ found: false, message: missingMsg }) : htmlMessage(missingMsg, true);
    }

    var d = parseIsoDate(dateIso);
    var fileNameBase = sanitizeFileName(client + '_' + docType + '_' + d.day + '_' + d.monthLong + '_' + d.year);

    if (mode === 'preview') {
      return (type === 'sheet') ? previewSheetDay(docId, d, dateIso) : previewDocDay(docId, d, fileNameBase);
    }

    var blob = (type === 'sheet')
      ? extractSheetDay(docId, d, fileNameBase, dateIso)
      : extractDocDay(docId, d, fileNameBase);

    if (!blob) {
      return htmlMessage(
        'No matching section found for ' + d.monthLong + ' ' + d.day + ', ' + d.year +
        '. Check that the master document actually contains a heading for this date.',
        true
      );
    }

    return htmlDownload(blob, fileNameBase + (type === 'sheet' ? '.xlsx' : '.docx'));
  } catch (err) {
    return mode === 'preview'
      ? jsonOutput({ found: false, message: 'Server error: ' + err.message })
      : htmlMessage('Server error: ' + err.message, true);
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function parseIsoDate(iso) {
  var parts = iso.split('-');
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  return { year: year, month: month, day: day, monthLong: MONTH_NAMES[month - 1] };
}

function ordinal(n) {
  var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildDateCandidates(d) {
  return [
    d.day + ' ' + d.monthLong + ' ' + d.year,
    ordinal(d.day) + ' ' + d.monthLong + ' ' + d.year,
    d.day + ' ' + d.monthLong + ', ' + d.year,
    ordinal(d.day) + ' ' + d.monthLong + ', ' + d.year,
    d.monthLong + ' ' + d.day + ', ' + d.year,
    d.monthLong + ' ' + d.day + ' ' + d.year,
    d.day + '-' + d.month + '-' + d.year
  ];
}

var ANY_DATE_HEADING_REGEX = /^\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s+\d{4}/i;

function isDateHeadingText(text, candidatesLower) {
  var normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  for (var i = 0; i < candidatesLower.length; i++) {
    if (normalized === candidatesLower[i] || normalized.indexOf(candidatesLower[i]) === 0) {
      return true;
    }
  }
  return false;
}

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
}

// ---------------------------------------------------------------------------
// Google Doc extraction (cumulative daily-briefing Doc -> single-day .docx)
// ---------------------------------------------------------------------------

function buildSlicedTempDoc(docId, d, fileNameBase) {
  var sourceDoc = DocumentApp.openById(docId);
  var body = sourceDoc.getBody();
  var candidatesLower = buildDateCandidates(d).map(function (c) { return c.toLowerCase(); });

  var numChildren = body.getNumChildren();
  var startIndex = -1;
  var endIndex = numChildren;

  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    var childType = child.getType();
    if (childType === DocumentApp.ElementType.PARAGRAPH || childType === DocumentApp.ElementType.LIST_ITEM) {
      var text = child.asText().getText();
      if (startIndex === -1) {
        if (isDateHeadingText(text, candidatesLower)) startIndex = i;
      } else if (i > startIndex && ANY_DATE_HEADING_REGEX.test(text.trim())) {
        endIndex = i;
        break;
      }
    }
  }

  if (startIndex === -1) return null;

  var tempDoc = DocumentApp.create(fileNameBase);
  var tempBody = tempDoc.getBody();
  var appendedCount = 0;

  for (var j = startIndex; j < endIndex; j++) {
    if (appendCopiedElement(tempBody, body.getChild(j))) appendedCount++;
  }

  // DocumentApp.create() always seeds a blank first paragraph; drop it once
  // real content has been appended so the export doesn't start with a gap.
  if (appendedCount > 0 && tempBody.getNumChildren() > appendedCount) {
    tempBody.removeChild(tempBody.getChild(0));
  }

  // The master doc places a "====" divider + brand logo as a sign-off AFTER
  // each day's articles (i.e. right before the next day's heading). Sliced on
  // its own, that reads as a trailing footer; move it to the top instead so
  // it works as a letterhead for the single-day file.
  moveTrailingBrandingToTop(tempBody);

  tempDoc.saveAndClose();
  return tempDoc;
}

function extractDocDay(docId, d, fileNameBase) {
  var tempDoc = buildSlicedTempDoc(docId, d, fileNameBase);
  if (!tempDoc) return null;

  var blob = exportViaUrlFetch('https://docs.google.com/document/d/' + tempDoc.getId() + '/export?format=docx').getBlob();
  DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
  return blob;
}

function previewDocDay(docId, d, fileNameBase) {
  var tempDoc = buildSlicedTempDoc(docId, d, fileNameBase);
  if (!tempDoc) {
    return jsonOutput({ found: false, message: 'No matching section found for this date in the document.' });
  }

  var html = exportViaUrlFetch('https://docs.google.com/document/d/' + tempDoc.getId() + '/export?format=html').getContentText();
  DriveApp.getFileById(tempDoc.getId()).setTrashed(true);
  return jsonOutput({ found: true, html: html });
}

function isBrandingOrDividerElement(child) {
  if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) return false;
  var para = child.asParagraph();
  var text = para.getText().trim();
  if (/^=+$/.test(text)) return true; // a "====" divider line
  if (text === '') {
    for (var i = 0; i < para.getNumChildren(); i++) {
      if (para.getChild(i).getType() === DocumentApp.ElementType.INLINE_IMAGE) return true;
    }
  }
  return false;
}

function insertCopiedElementAt(targetBody, sourceChild, index) {
  var type = sourceChild.getType();
  if (type === DocumentApp.ElementType.PARAGRAPH) {
    targetBody.insertParagraph(index, sourceChild.copy().asParagraph());
  } else if (type === DocumentApp.ElementType.LIST_ITEM) {
    targetBody.insertListItem(index, sourceChild.copy().asListItem());
  } else if (type === DocumentApp.ElementType.TABLE) {
    targetBody.insertTable(index, sourceChild.copy().asTable());
  }
}

function moveTrailingBrandingToTop(body) {
  var lastIndex = body.getNumChildren() - 1;
  var trailerElements = [];

  // Stop at index 1, never 0 - a document section can't be emptied down to
  // zero paragraphs, so at least the first element must always survive.
  while (lastIndex >= 1 && isBrandingOrDividerElement(body.getChild(lastIndex))) {
    trailerElements.unshift(body.getChild(lastIndex));
    lastIndex--;
  }

  if (trailerElements.length === 0) return;

  var copies = trailerElements.map(function (el) { return el.copy(); });
  for (var i = 0; i < trailerElements.length; i++) {
    body.removeChild(body.getChild(body.getNumChildren() - 1));
  }
  for (var j = 0; j < copies.length; j++) {
    insertCopiedElementAt(body, copies[j], j);
  }
}

function appendCopiedElement(targetBody, sourceChild) {
  var type = sourceChild.getType();
  if (type === DocumentApp.ElementType.PARAGRAPH) {
    targetBody.appendParagraph(sourceChild.copy().asParagraph());
    return true;
  }
  if (type === DocumentApp.ElementType.LIST_ITEM) {
    targetBody.appendListItem(sourceChild.copy().asListItem());
    return true;
  }
  if (type === DocumentApp.ElementType.TABLE) {
    targetBody.appendTable(sourceChild.copy().asTable());
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Google Sheet extraction (cumulative tracker Sheet -> single-day .xlsx)
// ---------------------------------------------------------------------------

function findMatchingSheetRows(sheetId, d) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) return null;

  // Some master sheets have a title/banner row (e.g. "NEXUS NEWS BRIEFING:
  // CUMULATIVE REPORT") above the real column headers. Scan the first few
  // rows for the one that actually contains a "Date" column instead of
  // assuming row 1 is always the header row.
  var headerRowIndex = -1;
  var dateColIndex = -1;
  var scanLimit = Math.min(values.length, 10);
  for (var hr = 0; hr < scanLimit && headerRowIndex === -1; hr++) {
    for (var hc = 0; hc < values[hr].length; hc++) {
      if (String(values[hr][hc]).trim().toLowerCase() === 'date') {
        headerRowIndex = hr;
        dateColIndex = hc;
        break;
      }
    }
  }
  if (headerRowIndex === -1) {
    headerRowIndex = 0; // best-effort fallback: no explicit "Date" header found
    dateColIndex = 1;
  }

  var headers = values[headerRowIndex];
  var candidatesLower = buildDateCandidates(d).map(function (c) { return c.toLowerCase(); });
  var dataRows = [];

  for (var r = headerRowIndex + 1; r < values.length; r++) {
    if (cellMatchesDate(values[r][dateColIndex], d, candidatesLower)) {
      dataRows.push(values[r]);
    }
  }

  if (dataRows.length === 0) return null;
  return { headers: headers, dataRows: dataRows };
}

function cellMatchesDate(cellVal, d, candidatesLower) {
  if (Object.prototype.toString.call(cellVal) === '[object Date]') {
    return cellVal.getFullYear() === d.year && (cellVal.getMonth() + 1) === d.month && cellVal.getDate() === d.day;
  }
  var text = String(cellVal || '').trim().toLowerCase();
  if (!text) return false;
  for (var c = 0; c < candidatesLower.length; c++) {
    if (text.indexOf(candidatesLower[c]) !== -1 || candidatesLower[c].indexOf(text) !== -1) return true;
  }
  return false;
}

function extractSheetDay(sheetId, d, fileNameBase, dateIso) {
  var ss = SpreadsheetApp.openById(sheetId);
  var daySheet = dateIso ? ss.getSheetByName(dateIso) : null;

  var tempSs = SpreadsheetApp.create(fileNameBase);

  if (daySheet) {
    // The master file has one tab per day (named "YYYY-MM-DD"); that tab
    // already IS the single day's content, section headers and all -
    // just clone it whole instead of trying to reconstruct it row by row.
    var defaultSheet = tempSs.getSheets()[0];
    var copiedSheet = daySheet.copyTo(tempSs);
    copiedSheet.setName(dateIso);
    tempSs.deleteSheet(defaultSheet);
  } else {
    var found = findMatchingSheetRows(sheetId, d);
    if (!found) {
      DriveApp.getFileById(tempSs.getId()).setTrashed(true);
      return null;
    }
    var allRows = [found.headers].concat(found.dataRows);
    tempSs.getSheets()[0].getRange(1, 1, allRows.length, found.headers.length).setValues(allRows);
  }

  SpreadsheetApp.flush(); // commit pending writes before exporting, or the export can race ahead of them

  var blob = exportViaUrlFetch('https://docs.google.com/spreadsheets/d/' + tempSs.getId() + '/export?format=xlsx').getBlob();
  DriveApp.getFileById(tempSs.getId()).setTrashed(true);
  return blob;
}

function previewSheetDay(sheetId, d, dateIso) {
  var ss = SpreadsheetApp.openById(sheetId);
  var daySheet = dateIso ? ss.getSheetByName(dateIso) : null;

  if (daySheet) {
    return jsonOutput({ found: true, rows: buildCellGridWithLinks(daySheet.getDataRange()) });
  }

  var found = findMatchingSheetRows(sheetId, d);
  if (!found) {
    return jsonOutput({ found: false, message: 'No rows found for this date in the sheet.' });
  }
  var plainRows = [found.headers].concat(found.dataRows).map(function (row) {
    return row.map(function (cell) { return { text: cell, url: null }; });
  });
  return jsonOutput({ found: true, rows: plainRows });
}

// getValues() only returns a cell's display text, not the URL behind a link
// (whether applied as rich text or via a =HYPERLINK() formula) - the preview
// needs the real URL so it can render an actual clickable link.
function buildCellGridWithLinks(range) {
  var values = range.getValues();
  var richTextValues = range.getRichTextValues();
  var formulas = range.getFormulas();
  var hyperlinkFormulaRegex = /HYPERLINK\(\s*"([^"]+)"/i;

  var grid = [];
  for (var r = 0; r < values.length; r++) {
    var rowOut = [];
    for (var c = 0; c < values[r].length; c++) {
      var url = richTextValues[r][c] ? richTextValues[r][c].getLinkUrl() : null;
      if (!url && formulas[r][c]) {
        var match = formulas[r][c].match(hyperlinkFormulaRegex);
        if (match) url = match[1];
      }
      rowOut.push({ text: values[r][c], url: url });
    }
    grid.push(rowOut);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Shared export + response helpers
// ---------------------------------------------------------------------------

function exportViaUrlFetch(url) {
  var token = ScriptApp.getOAuthToken();
  return UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function htmlDownload(blob, filename) {
  var base64 = Utilities.base64Encode(blob.getBytes());
  var mimeType = blob.getContentType();
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="font-family:sans-serif;text-align:center;padding-top:80px;">' +
    '<p id="status">Preparing your download&hellip;</p>' +
    '<script>' +
    '(function() {' +
    '  var b64 = "' + base64 + '";' +
    '  var mime = "' + mimeType + '";' +
    '  var byteChars = atob(b64);' +
    '  var byteNumbers = new Array(byteChars.length);' +
    '  for (var i = 0; i < byteChars.length; i++) { byteNumbers[i] = byteChars.charCodeAt(i); }' +
    '  var byteArray = new Uint8Array(byteNumbers);' +
    '  var blob = new Blob([byteArray], { type: mime });' +
    '  var link = document.createElement("a");' +
    '  link.href = URL.createObjectURL(blob);' +
    '  link.download = "' + filename.replace(/"/g, '') + '";' +
    '  document.body.appendChild(link);' +
    '  link.click();' +
    '  document.getElementById("status").textContent = "Download complete — you can close this tab.";' +
    '})();' +
    '</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html);
}

function htmlMessage(message, isError) {
  var color = isError ? '#b91c1c' : '#0f172a';
  return HtmlService.createHtmlOutput(
    '<html><body style="font-family:sans-serif;color:' + color + ';text-align:center;padding-top:80px;">' +
    '<p>' + message + '</p></body></html>'
  );
}
