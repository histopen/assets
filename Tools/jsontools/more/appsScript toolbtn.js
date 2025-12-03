//btn sheet: https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc/edit?gid=0#gid=0
//apps script: https://script.google.com/u/0/home/projects/10L8OzHyNkCb13mXT3HUBhMvZDgfb8vUuAdJBKrmQOKj_1r6bWDQCcKQW/edit
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Export');
  var vals = sheet.getDataRange().getValues();
  var headers = vals[0];
  var objects = [];
  for (var i = 1; i < vals.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = vals[i][j];
    }
    objects.push(rowObj);
  }
  return ContentService
    .createTextOutput(JSON.stringify([objects]))
    .setMimeType(ContentService.MimeType.JSON);
}