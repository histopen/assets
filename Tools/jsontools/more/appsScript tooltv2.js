//tv sheet: https://docs.google.com/spreadsheets/d/1Zxa19uBdmo92-_-_wx2q4LHYLgilhOLbs8lkByW46-8/edit?gid=2123550743#gid=2123550743
//apps script: https://script.google.com/u/0/home/projects/1n0JsF9A6cxLFYPigdYY3_2OSp5sLTIegRuMYFAS2CmSGyo1kyUOqVek2/edit
function onEdit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  if (sheetName === "Timeviews") {setRowColorsFormat2()}
}

function doGet(e) {
  var sheetName = e && e.parameter && e.parameter.sheet ? e.parameter.sheet : 'Export';
  if (sheetName === 'Timeviews') {return getTimeviewsData()}
}

function setRowColorsFormat2() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastColumn = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var bgColumn = headers.indexOf("bgColor") + 1;
  var fgColumn = headers.indexOf("textColor") + 1;

  var targetColumnNames = ["startYear", "startMonth", "startDay", "endYear", "endMonth", "endDay", "bgColor", "textColor"];
  var targetColumns = targetColumnNames.map(function(name) {
    return headers.indexOf(name); // 0-indexed for array access
  }).filter(function(col) {
    return col >= 0;
  });

  if (bgColumn === 0 || fgColumn === 0) {
    throw new Error("Could not find 'bgColor' or 'textColor' column");
  }

  var numRows = lastRow - 1;
  var bgValues = sheet.getRange(2, bgColumn, numRows, 1).getValues();
  var fgValues = sheet.getRange(2, fgColumn, numRows, 1).getValues();

  // Apply colors per target column (batch per column)
  for (var j = 0; j < targetColumns.length; j++) {
    var col = targetColumns[j] + 1; // Back to 1-indexed
    var bgColors = [];
    var fontColors = [];

    for (var i = 0; i < numRows; i++) {
      var bg = bgValues[i][0] ? ('#' + bgValues[i][0]) : null;
      var fg = fgValues[i][0] ? ('#' + fgValues[i][0]) : null;
      bgColors.push([bg]);
      fontColors.push([fg]);
    }

    sheet.getRange(2, col, numRows, 1).setBackgrounds(bgColors);
    sheet.getRange(2, col, numRows, 1).setFontColors(fontColors);
  }
}

function getTimeviewsData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Timeviews');
  var vals = sheet.getDataRange().getValues();
  var headers = vals[0];

  var columnMapping = {
    "caption": "caption",
    "startYear": "startYear",
    "startMonth": "startMonth",
    "startDay": "startDay",
    "endYear": "endYear",
    "endMonth": "endMonth",
    "endDay": "endDay",
    "bgColor": "bgColor",
    "textColor": "textColor",
    "width": "width",
    "url": "url",
    "fragment": "fragment"
  };

  var sheetColumns = Object.keys(columnMapping);
  var columnIndices = sheetColumns.map(function(col) {
    return headers.indexOf(col);
  });

  var cultureIndex = headers.indexOf("culture");
  var titleIndex = headers.indexOf("title");

  var grouped = {};
  for (var i = 1; i < vals.length; i++) {
    var row = vals[i];
    var culture = row[cultureIndex];
    var title = row[titleIndex];

    if (!culture || !title) continue;

    if (!grouped[culture]) grouped[culture] = {};
    if (!grouped[culture][title]) grouped[culture][title] = [];

    var entry = {};
    for (var j = 0; j < sheetColumns.length; j++) {
      var col = sheetColumns[j];
      var idx = columnIndices[j];
      if (idx >= 0) {
        entry[columnMapping[col]] = row[idx];
      }
    }

    grouped[culture][title].push(entry);
  }

  return ContentService
    .createTextOutput(JSON.stringify(grouped))
    .setMimeType(ContentService.MimeType.JSON);
}
