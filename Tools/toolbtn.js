// Usage: node toolbtn.js
import { getSheetData } from './more/getSheetData.js';
import { saveJsonToFile } from './more/saveJsonToFile.js';

//editable Gsheet: https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc/edit?gid=0#gid=0

//1) Share > anyone with the link + viewer

//2) tab to export must be called "Export"

//3) File>Share>Publish to web> 1) Link 2) select tab (not "entire document") 3) embed "web page"
//HTML published: https://docs.google.com/spreadsheets/d/e/2PACX-1vRJPsA-u5zzZSlVVk0NHlX1otYpdMze8NmTgtU1sObz6necwJQu_c_f8ozTqoo_Fwpmkyh9qn8fq1Lq/pubhtml?gid=0&single=true

//4) Extensions > Apps Script > paste appsScript toolbtn.js
//apps script: https://script.google.com/u/0/home/projects/10L8OzHyNkCb13mXT3HUBhMvZDgfb8vUuAdJBKrmQOKj_1r6bWDQCcKQW/edit

//5) Deploy > New deployment > type: Web app > execute as "Me", access "anyone"
//deploymentID: AKfycbxabNE-m-M1cfO4K6FBsL4_UtKT67JqVsIVUFbwjnTKoF4gBA5fimkuYIlOScfWs5pu
//Webapp: https://script.google.com/macros/s/AKfycbxabNE-m-M1cfO4K6FBsL4_UtKT67JqVsIVUFbwjnTKoF4gBA5fimkuYIlOScfWs5pu/exec

//npm run btn    ==> updates src/config/buttonsConfig.json
async function toolbtn() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbxabNE-m-M1cfO4K6FBsL4_UtKT67JqVsIVUFbwjnTKoF4gBA5fimkuYIlOScfWs5pu/exec";

  const pathname = "../../../src/components/Shared/ButtonsDisplay/";
  const filename = "buttonsConfig.json";

  try {
    const data = await getSheetData(webappUrl);

    saveJsonToFile(pathname, filename, data);
    console.log(`...SAVED ${pathname}/${filename} !\n`);
  } catch (err) {
    console.error(`Error ${pathname}/${filename}`, err.message);
  }
}

toolbtn().catch(err => {
  console.error('Error running toolbtn:', err);
  process.exit(1);
});
