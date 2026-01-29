// Usage: node tooltv2.js
import { getSheetData } from './more/getSheetData.js';
import { saveJsonToFile } from './more/saveJsonToFile.js';

// Editable Google Sheet: https://docs.google.com/spreadsheets/d/1Zxa19uBdmo92-_-_wx2q4LHYLgilhOLbs8lkByW46-8/edit?gid=2123550743#gid=2123550743

// 1) Share > anyone with the link + viewer

// 2) Tab to export must be called "Timeviews"

// 3) File>Share>Publish to web> 1) Link 2) select tab (not "entire document") 3) embed "web page"
//    HTML published: (not needed for web app deployment)

// 4) Extensions > Apps Script > appsScript tooltv2.js
//    apps script: https://script.google.com/u/0/home/projects/1n0JsF9A6cxLFYPigdYY3_2OSp5sLTIegRuMYFAS2CmSGyo1kyUOqVek2/edit

// 5) Deploy > New deployment > type: Web app > execute as "Me", access "anyone"
//    deploymentID: AKfycbzzPOjUtB7mrshmto7Y1062pHCUokQiHy2zU3SbXla3QTJ4al3PjqmH47jW5sue4CnQTA
//    Webapp: https://script.google.com/macros/s/AKfycbzzPOjUtB7mrshmto7Y1062pHCUokQiHy2zU3SbXla3QTJ4al3PjqmH47jW5sue4CnQTA/exec

// npm run tv ==> updates Jsons/tvConfig2.json
async function tooltv2() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbzzPOjUtB7mrshmto7Y1062pHCUokQiHy2zU3SbXla3QTJ4al3PjqmH47jW5sue4CnQTA/exec?sheet=Timeviews";

  const pathname = "../../../Jsons";
  const filename = "tvConfig2.json";

  try {
    const data = await getSheetData(webappUrl);
    saveJsonToFile(pathname, filename, data);
  } catch (err) {
    console.error(`Error saving ${pathname}/${filename}:`, err.message);
    process.exit(1);
  }
}

tooltv2().catch(err => {
  console.error('Error running tooltv2:', err);
  process.exit(1);
});
