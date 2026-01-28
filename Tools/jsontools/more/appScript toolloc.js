//loc sheet: https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc/edit?gid=0#gid=0
//apps script: https://script.google.com/u/0/home/projects/1QauKbwEl7QCTkfcybOGoRLtCZEwaf3snR_Z8TvdaEZqH19YoQqsrbAKL/edit
function doGet(e) {
  var lang = e.parameter.lang;
  var vals = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('loc').getDataRange().getValues();
  var colInd = -1;
  
  // Start scanning from column C (index 2)
  for (var i = 2; i < vals[0].length; i++) {
    if (vals[0][i] == lang) {
      colInd = i;
      break;
    }
  }
  
  if (colInd == -1) {
    return ContentService.createTextOutput("Error: Requested Language not found!");
  } else {
    var output = {};
    for (var i = 1; i < vals.length; i++) {
      if (vals[i][1] != '' && vals[i][1] != null && (vals[i][0] == '' || vals[i][0] == null)) {
        output[vals[i][1]] = vals[i][colInd];
      }
    }
    return ContentService.
      createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }
}