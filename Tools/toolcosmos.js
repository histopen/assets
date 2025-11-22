// Usage: node toolcosmos.js
import { getSheetData } from './more/getSheetData.js';
import { saveJsonToFile } from './more/saveJsonToFile.js';

//editable Gsheet: https://docs.google.com/spreadsheets/d/1pWIrnNb7jKis5M0ftDJ9CvAgVUytXaKW41-dquWfS5I/edit?gid=816391742#gid=816391742

//1) Share > anyone with the link + viewer

//2) tab to export must be called "Export"

//3) File>Share>Publish to web> 1) Link 2) select tab (not "entire document") 3) embed "web page"
//HTML published: https://docs.google.com/spreadsheets/d/e/2PACX-1vTxL8-kuYJiQgC13iClSkq8T1HK3Fqq92HOM4skUXymGM4ur9Z1_5vWzuabpMvGhzUCq5WCTrBwyU1H/pubhtml?gid=816391742&single=true

//4) Extensions > Apps Script > paste appsScript toolcosmos.js
//apps script: https://script.google.com/u/0/home/projects/1RcjKCvhg8seCNJ6SuHdGEtLrNbbHro5WMPrmH-WtgcF-dUEBpI7jYvKc/edit

//5) Deploy > New deployment > type: Web app > execute as "Me", access "anyone"
//deploymentID: //deploymentID: AKfycbzGTyjZRgT8-EWwPODu0IHSSJ1x_Vw63AEQk-QASsbTiWRdNJgPJ7POJBOjlmkDl9-3iA
//Webapp: https://script.google.com/macros/s/AKfycbzGTyjZRgT8-EWwPODu0IHSSJ1x_Vw63AEQk-QASsbTiWRdNJgPJ7POJBOjlmkDl9-3iA/exec

//npm run cosmos    ==> updates public/cosmos/cosmos.json
async function toolcosmos() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbzGTyjZRgT8-EWwPODu0IHSSJ1x_Vw63AEQk-QASsbTiWRdNJgPJ7POJBOjlmkDl9-3iA/exec";

  const pathname = "../../Jsons";
  const filename = "cosmos.json";

  try {
    const data = await getSheetData(webappUrl);

    saveJsonToFile(pathname, filename, data);
    console.log(`...SAVED ${pathname}/${filename} !\n`);
  } catch (err) {
    console.error(`Error saving ${pathname}/${filename}:`, err.message);
  }
}

toolcosmos().catch(err => {
  console.error('Error running toolcosmos:', err);
  process.exit(1);
});
