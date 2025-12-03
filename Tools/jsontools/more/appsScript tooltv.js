//tv sheet: https://docs.google.com/spreadsheets/d/1-aKx4qxKP-cK0Tq5XyMW0G4fa_BBc8go6cWh8kyYydI/edit?gid=74975219#gid=74975219
//apps script: https://script.google.com/u/0/home/projects/16PM-D7uT6ZewJdoMc8r1Op83R4W9AoGNX3lDwxIoJxVBrdqxS6gacmJK/edit
function onEdit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const colSelect = e.range.getColumn()
  const bgColumn = 4; // Column C
  const fgColumn = 5; // Column D
  if (colSelect === bgColumn || colSelect === fgColumn) {setRowColors()} //call setRowColors if value changes in color columns
}

function setRowColors() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const bgColumn = 4; // Column C
  const fgColumn = 5; // Column D
  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return; // No data

  var numRows = lastRow - 1;
  var bgValues = sheet.getRange(2, bgColumn, numRows, 1).getValues();
  var fgValues = sheet.getRange(2, fgColumn, numRows, 1).getValues();

  var bgColors = [];
  var fontColors = [];
  for (var i = 0; i < numRows; i++) {
    var bg = bgValues[i][0] ? ('#' + bgValues[i][0]) : null;
    var fg = fgValues[i][0] ? ('#' + fgValues[i][0]) : null;
    var bgRow = [];
    var fgRow = [];
    for (var j = 0; j < lastColumn; j++) {
      bgRow.push(bg);
      fgRow.push(fg);
    }
    bgColors.push(bgRow);
    fontColors.push(fgRow);
  }
  sheet.getRange(2, 1, numRows, lastColumn).setBackgrounds(bgColors);
  sheet.getRange(2, 1, numRows, lastColumn).setFontColors(fontColors);
}

//i want a function that shows a color picker and saves the color picked in the activecell
function showColorPicker() {
  var html = HtmlService.createHtmlOutputFromFile('ColorPicker')
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pick a Color');
}

function saveColor(color) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange();
  range.setBackground(color);
}

function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Export');
  var vals = sheet.getDataRange().getValues();
  var headers = vals[0];
  var tvIndex = headers.indexOf('tv');
  var grouped = {};
  for (var i = 1; i < vals.length; i++) {
    var row = vals[i];
    var tv = row[tvIndex];
    if (!grouped[tv]) grouped[tv] = [];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] !== 'tv') {
        obj[headers[j]] = row[j];
      }
    }
    grouped[tv].push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify(grouped)).setMimeType(ContentService.MimeType.JSON);
}