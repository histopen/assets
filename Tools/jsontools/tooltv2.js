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

// Validate that start date <= end date for each entry
function validateTimeviewDates(data) {
  const warnings = [];

  // Iterate through cultures
  for (const [culture, timeviews] of Object.entries(data)) {
    // Iterate through timeview titles
    for (const [title, entries] of Object.entries(timeviews)) {
      // Iterate through entries
      entries.forEach((entry, index) => {
        const { caption, startYear, startMonth, startDay, endYear, endMonth, endDay } = entry;

        // Skip validation if end date is missing (ongoing events)
        if (endYear === null || endYear === undefined) {
          return;
        }

        // Create comparable date values (YYYYMMDD format)
        const startDate = startYear * 10000 + (startMonth || 0) * 100 + (startDay || 0);
        const endDate = endYear * 10000 + (endMonth || 0) * 100 + (endDay || 0);

        if (startDate > endDate) {
          warnings.push({
            culture,
            title,
            index: index + 1,
            caption: caption || '(no caption)',
            startDate: `${startYear}/${startMonth || '?'}/${startDay || '?'}`,
            endDate: `${endYear}/${endMonth || '?'}/${endDay || '?'}`
          });
        }
      });
    }
  }

  return warnings;
}

// npm run tv ==> updates Jsons/tvConfig2.json
async function tooltv2() {
  const webappUrl = "https://script.google.com/macros/s/AKfycbzzPOjUtB7mrshmto7Y1062pHCUokQiHy2zU3SbXla3QTJ4al3PjqmH47jW5sue4CnQTA/exec?sheet=Timeviews";

  const pathname = "../../../Jsons";
  const filename = "tvConfig2.json";

  try {
    const data = await getSheetData(webappUrl);

    // Validate dates before saving
    const warnings = validateTimeviewDates(data);

    if (warnings.length > 0) {
      console.log('\n\x1b[33m⚠ WARNING: Date validation issues found:\x1b[0m');
      warnings.forEach(w => {
        console.log(`\x1b[33m  • ${w.culture}/${w.title} #${w.index}: "${w.caption}"\x1b[0m`);
        console.log(`\x1b[33m    Start (${w.startDate}) > End (${w.endDate})\x1b[0m`);
      });
      console.log('\n');
    }

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
