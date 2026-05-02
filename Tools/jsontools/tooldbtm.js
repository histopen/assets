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
//deploymentID: AKfycbz7nH0asfmqBery1qbII2JmkmGrWaWJAiepl6Dw_OQ2FbVfxI_xAgRLtMc_bSGKS3qA
//Webapp: https://script.google.com/macros/s/AKfycbz7nH0asfmqBery1qbII2JmkmGrWaWJAiepl6Dw_OQ2FbVfxI_xAgRLtMc_bSGKS3qA/exec

//npm run dbtm    ==> updates public/database/dbtm.json
function checkDuplicates(rows, fields) {
  const duplicates = [];
  for (const field of fields) {
    const seen = new Map();
    rows.forEach((row, i) => {
      const val = row[field];
      if (val === undefined || val === '') return;
      if (!seen.has(val)) seen.set(val, []);
      seen.get(val).push(i + 2); // +2: 1-based + header row
    });
    for (const [value, rowNums] of seen) {
      if (rowNums.length > 1) duplicates.push({ field, value, rows: rowNums });
    }
  }
  return duplicates;
}

async function tooldbtm() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbz7nH0asfmqBery1qbII2JmkmGrWaWJAiepl6Dw_OQ2FbVfxI_xAgRLtMc_bSGKS3qA/exec";

  const pathname = "../../../Jsons";
  const filename = "dbtm.json";

  try {
    const data = await getSheetData(webappUrl);
    const rows = data[0];

    const duplicates = checkDuplicates(rows, ['wtId', 'rank']);
    if (duplicates.length > 0) {
      console.error('\n\x1b[41m\x1b[97m╔══════════════════════════════════════════════════════════╗\x1b[0m');
      console.error('\x1b[41m\x1b[97m║           BUILD REFUSED — DUPLICATE VALUES FOUND          ║\x1b[0m');
      console.error('\x1b[41m\x1b[97m╚══════════════════════════════════════════════════════════╝\x1b[0m');
      console.error('\x1b[31mdbtm.json was NOT updated. Fix the sheet before rebuilding.\x1b[0m');
      for (const { field, value, rows } of duplicates) {
        console.error(`\x1b[33m  • Duplicate ${field} = "${value}" on rows: ${rows.join(', ')}\x1b[0m`);
      }
      console.error('');
      process.exit(1);
    }

    saveJsonToFile(pathname, filename, data);
  } catch (err) {
    console.error(`Error ${pathname}/${filename}`, err.message);
    process.exit(1);
  }
}

tooldbtm().catch(err => {
  console.error('Error running tooldbtm:', err);
  process.exit(1);
});
