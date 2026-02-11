//db sheet: https://docs.google.com/spreadsheets/d/1OGOFf6rSTcJCxB9-EVVoeDD6fp9_ZVbqdN9mx2IeUzo/edit?gid=1057227258#gid=1057227258
//apps script: https://script.google.com/u/0/home/projects/132Joze39ToD7x8mix2jAbQzIIf9l7exsug2IJ-T4DE2d2D2yE8W2ugyR/edit
function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Export');
  var vals = sheet.getDataRange().getValues();
  var headers = vals[0];
  var objects = [];
  var namedRangesToExport = [
    'zoomscale', 'endZoomscale', 'iconId',
    'caption', //'tooltip', 
    'url', 'fragment',
    'startCirca', 'startCircaUnit', 'startDay', 'startMonth', 'startYear',
    'endCirca', 'endCircaUnit', 'endDay', 'endMonth', 'endYear',
    'categories', 'countries'
  ];

  for (var i = 1; i < vals.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = vals[i][j];
    }
    // Only export rows where zoomscale is not empty
    if (rowObj['zoomscale'] !== undefined && rowObj['zoomscale'] !== '') {
      // Only include named ranges in the export
      var filteredRowObj = {};
      namedRangesToExport.forEach(function(key) {
      if (rowObj[key] !== undefined && rowObj[key] !== '') {
        filteredRowObj[key] = rowObj[key];
      }
      });
      objects.push(filteredRowObj);
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify([objects]))
    .setMimeType(ContentService.MimeType.JSON);
}
