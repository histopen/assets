// Usage: node tooldbtm.js
import { getSheetData } from './more/getSheetData.js';
import { saveJsonToFile } from './more/saveJsonToFile.js';

//editable Gsheet: https://docs.google.com/spreadsheets/d/1OGOFf6rSTcJCxB9-EVVoeDD6fp9_ZVbqdN9mx2IeUzo

//1) Share > anyone with the link + viewer

//2) tab to export must be called "Export"

//3) File>Share>Publish to web> 1) Link 2) select "Export" (not "entire document") 3) embed "web page"
//HTML published: https://docs.google.com/spreadsheets/d/e/2PACX-1vRDRBhPJnnEdZ59H3OQFRenTsKNqgFjyd9J1j50_DulRA_G8_4H6jcXDgU3sIRkzNU7H1BtT-ncNjgf/pubhtml?gid=1057227258&single=true

//4) Extensions > Apps Script > paste appsScript tooldbtm.js
//apps script: https://script.google.com/u/0/home/projects/132Joze39ToD7x8mix2jAbQzIIf9l7exsug2IJ-T4DE2d2D2yE8W2ugyR/edit

//5) Deploy > New deployment > type: Web app > execute as "Me (pierre@wikitime.org)", access "anyone"
//deploymentID: AKfycbzLSxd1elesf9GBV3Sxhb3RtFV-qYsq4WocjKBgMGT3-Dc85EbQ3RORvQFxFBeRVV_N
//Webapp: https://script.google.com/macros/s/AKfycbzLSxd1elesf9GBV3Sxhb3RtFV-qYsq4WocjKBgMGT3-Dc85EbQ3RORvQFxFBeRVV_N/exec

//npm run dbtm    ==> updates public/database/dbtm.json
async function tooldbtm() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbzLSxd1elesf9GBV3Sxhb3RtFV-qYsq4WocjKBgMGT3-Dc85EbQ3RORvQFxFBeRVV_N/exec";

  try {
    const data = await getSheetData(webappUrl);
    const pathname = "../../../Jsons";
    const filename = "dbtm.json";

    saveJsonToFile(pathname, filename, data);
  } catch (err) {
    console.error(`Error ${pathname}/${filename}`, err.message);
  }
}

tooldbtm().catch(err => {
  console.error('Error running tooldbtm:', err);
  process.exit(1);
});
