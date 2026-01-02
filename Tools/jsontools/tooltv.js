// Usage: node tooltv.js
import { getSheetData } from './more/getSheetData.js';
import { saveJsonToFile } from './more/saveJsonToFile.js';

//editable Gsheet: https://docs.google.com/spreadsheets/d/1-aKx4qxKP-cK0Tq5XyMW0G4fa_BBc8go6cWh8kyYydI/edit?gid=74975219#gid=74975219

//1) Share > anyone with the link + viewer

//2) tab to export must be called "Export"

//3) File>Share>Publish to web> 1) Link 2) select tab (not "entire document") 3) embed "web page"
//HTML published: https://docs.google.com/spreadsheets/d/e/2PACX-1vTiwi3UXlLIIphq9kxe9wa0AiY9OZXNdExRFEN-KaokgObSjqgk7qeRKV5Is7uS1euwXfAi5doooW0B/pubhtml?gid=74975219&single=true

//4) Extensions > Apps Script > paste appsScript tooltv.js
//apps script: https://script.google.com/u/0/home/projects/16PM-D7uT6ZewJdoMc8r1Op83R4W9AoGNX3lDwxIoJxVBrdqxS6gacmJK/edit

//5) Deploy > New deployment > type: Web app > execute as "Me", access "anyone"
//deploymentID: //deploymentID: AKfycbyCMd-yLxrq1wXWOLlDIRAXux5kLohfOCxJj09wgAlaNBVifStq1u8BzNnMAeLkmoL0
//Webapp: https://script.google.com/macros/s/AKfycbyCMd-yLxrq1wXWOLlDIRAXux5kLohfOCxJj09wgAlaNBVifStq1u8BzNnMAeLkmoL0/exec

//npm run tv    ==> updates src/assets/timeviews/tvConfig.json
async function tooltv() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbyCMd-yLxrq1wXWOLlDIRAXux5kLohfOCxJj09wgAlaNBVifStq1u8BzNnMAeLkmoL0/exec";

  try {
    const data = await getSheetData(webappUrl);
    const pathname = "../../../Jsons"
    const filename = "tvConfig.json";

    saveJsonToFile(pathname, filename, data);
  } catch (err) {
    console.error(`Error ${pathname}/${filename}`, err.message);
  }
}

tooltv().catch(err => {
  console.error('Error running tooltv:', err);
  process.exit(1);
});

