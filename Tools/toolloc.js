// Usage: node toolloc.js
import { getSheetData } from './more/getSheetData.js';
import { saveJsonToFile } from './more/saveJsonToFile.js';

//editable Gsheet: https://docs.google.com/spreadsheets/d/122F4RZYbeBNl10tjWZYjimDzUazSMN1jyQaatOtxSR8/edit?gid=973949638#gid=973949638

//1) Share > anyone with the link + viewer

//2) tab to export must be called "Export"

//3) File>Share>Publish to web> 1) Link 2) select tab (not "entire document") 3) embed "web page"
//HTML published: https://docs.google.com/spreadsheets/d/e/2PACX-1vQHrT-kvALSpDSKjjS9jNeduVBMDoNvaVxYZ72vuD4iARMtWl0xJuJJAmvVtRHoqoaKD_JSXGXs5g58/pubhtml?gid=973949638&single=true

//4) Extensions > Apps Script > appsScript toolloc.js
//apps script: https://script.google.com/u/0/home/projects/1QauKbwEl7QCTkfcybOGoRLtCZEwaf3snR_Z8TvdaEZqH19YoQqsrbAKL/edit

//5) Deploy > New deployment > type: Web app > execute as "Me", access "anyone"
//deploymentID: AKfycbxS9OTyrEAS_jpf41PiFJttzDbEuUvVgkm88nxwVkzZhDHzClEy-VXBrs-NNtYNRCOe
//Webapp: https://script.google.com/macros/s/AKfycbxS9OTyrEAS_jpf41PiFJttzDbEuUvVgkm88nxwVkzZhDHzClEy-VXBrs-NNtYNRCOe/exec


//npm run loc    ==> updates public/locales/*.json (all languages)
//npm run loc en ==> updates en.json               (1 language: en	fr	it	de	es	nl	pl	uk	ru	sv)
async function toolloc() {
  const webappUrl = "https://script.google.com/a/macros/wikitime.org/s/AKfycbxS9OTyrEAS_jpf41PiFJttzDbEuUvVgkm88nxwVkzZhDHzClEy-VXBrs-NNtYNRCOe/exec";

  const allLanguages = ["en", "fr", "it", "de", "es", "nl", "pl", "uk", "ru", "sv", "hi", "ja"];
  const argLang = process.argv[2];
  const languages = argLang ? [argLang] : allLanguages;

  for (const lang of languages) {
    try {
      const data = await getSheetData(`${webappUrl}?lang=${lang}`);
      const pathname = "../../Jsons/language"
      const filename = `${lang}.json`;

      saveJsonToFile(pathname, filename, data);
    console.log(`...SAVED ${pathname}/${filename} !\n`);
  } catch (err) {
    console.error(`Error ${pathname}/${filename}`, err.message);
    }
  }
}

toolloc().catch(err => {
  console.error('Error running toolloc:', err);
  process.exit(1);
});

