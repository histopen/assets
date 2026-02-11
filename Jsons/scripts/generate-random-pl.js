/**
 * Generate Random Panel Lines (PL)
 * Randomly picks 8 panel lines from userAccountTimeData.json and academyTimeData.json
 * Usage: node assets/Jsons/scripts/generate-random-pl.js [--output=<file>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to source JSON files (relative to this script location)
const USER_ACCOUNT_PATH = path.join(__dirname, '../timeObjectsServer/userAccountTimeData.json');
const ACADEMY_PATH = path.join(__dirname, '../timeObjectsServer/academyTimeData.json');

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Randomly shuffle array
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Main function
 */
function main() {
  console.log('🎲 Generating random panel lines...\n');

  // Read both JSON files
  console.log('📖 Reading source files...');
  const userAccountData = readJsonFile(USER_ACCOUNT_PATH);
  const academyData = readJsonFile(ACADEMY_PATH);

  console.log(`   - userAccountTimeData.json: ${userAccountData.length} panel lines`);
  console.log(`   - academyTimeData.json: ${academyData.length} panel lines`);

  // Combine all panel lines
  const allPanelLines = [...userAccountData, ...academyData];
  console.log(`   - Total available: ${allPanelLines.length} panel lines\n`);

  // Randomly pick 8
  const shuffled = shuffle(allPanelLines);
  const selected = shuffled.slice(0, 8);

  // Generate UI debug command pattern script
  const commands = [];

  commands.push({
    command: "comment",
    params: { text: "=== Add 8 Random Panel Lines ===" }
  });

  selected.forEach((item, index) => {
    const data = item[1];

    commands.push({
      command: "setTimeShadow",
      params: {
        timeObject: {
          Database: "dbUserAccount",
          DatabaseKey: index,
          TOType: "timeData",
          timeDataCaption: data.timeDataCaption,
          timeDataUrl: data.timeDataUrl,
          timeDataDate: data.timeDataDate
        }
      }
    });

    commands.push({ command: "delay", params: { ms: 300 } });
    commands.push({ command: "addPanelLine", params: {} });
    commands.push({ command: "delay", params: { ms: 500 } });
  });

  commands.push({
    command: "comment",
    params: { text: "All 8 random panel lines added!" }
  });

  const result = {
    name: "8 Random Panel Lines",
    description: "Adds 8 randomly selected panel lines from academy and user account data",
    commands: commands
  };

  // Default output filename
  const defaultOutput = 'test-random-8pl.json';
  const outputArg = process.argv.find(arg => arg.startsWith('--output='));
  const outputFilename = outputArg ? outputArg.split('=')[1] : defaultOutput;
  const outputPath = path.join(__dirname, outputFilename);

  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ Created UI debug script: ${outputPath}\n`);

  // Display summary
  console.log('📋 Panel lines in script:');
  selected.forEach((item, index) => {
    const data = item[1];
    const { timeDataCaption, timeDataDate } = data;
    const startYear = timeDataDate.startYear;
    const endYear = timeDataDate.endYear;
    console.log(`   [${index}] ${timeDataCaption} (${startYear}-${endYear})`);
  });

  console.log('\n💡 Usage:');
  console.log('   1. Generate script: node assets/Jsons/scripts/generate-random-pl.js');
  console.log(`   2. Refresh browser (Ctrl+Shift+R) to load new script`);
  console.log('   3. Open debug menu and select "8 Random Panel Lines" from dropdown');
  console.log('\n   Custom filename: node assets/Jsons/scripts/generate-random-pl.js --output=my-script.json');
}

main();
