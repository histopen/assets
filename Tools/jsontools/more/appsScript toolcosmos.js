//cosmos sheet: https://docs.google.com/spreadsheets/d/1pWIrnNb7jKis5M0ftDJ9CvAgVUytXaKW41-dquWfS5I/edit?gid=816391742#gid=816391742
//apps script: https://script.google.com/u/0/home/projects/1RcjKCvhg8seCNJ6SuHdGEtLrNbbHro5WMPrmH-WtgcF-dUEBpI7jYvKc/edit
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Export');
  var vals = sheet.getDataRange().getValues();

// Find columns to include (where row 0 is not false)
var includeCols = vals[0].map((v, i) => v !== false ? i : -1).filter(i => i !== -1);

// Get keys from row 1 for included columns
var keys = includeCols.map(i => vals[1][i]);

// Build array of objects for each row (from row 2 and below)
vals = vals.slice(2).map(row => {
  var obj = {};
  includeCols.forEach((colIdx, i) => {
    obj[keys[i]] = row[colIdx];
  });
  return obj;
});


  return ContentService
    .createTextOutput(JSON.stringify(vals))
    .setMimeType(ContentService.MimeType.JSON);
}