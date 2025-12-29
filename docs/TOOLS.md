| Category | Type | Description | npm run command | File Output | Google Sheet |
|------------------|------|--------------------------|-------------------------|-------------------------------|-----------------------------------------------------------------------|
| atlas | svg | timeline icons atlas | `npm run atlas` | TimelineAtlas/timeline-atlas.png | N/A |
| localization | json | localization strings | `npm run loc`<br>`npm run loc en` | Jsons/language/en.json, etc. | [sheet](https://docs.google.com/spreadsheets/d/122F4RZYbeBNl10tjWZYjimDzUazSMN1jyQaatOtxSR8) |
| buttons | json | UI button configuration | `npm run btn` | Jsons/buttonsConfig.json | [sheet](https://docs.google.com/spreadsheets/d/1q7X86GjY9ULTf3P8AH4fdjl6nPc0JADQaWQWlP798sc) |
| timeview buttons | json | timeview buttons | `npm run tv` | Jsons/tvConfig.json | [sheet](https://docs.google.com/spreadsheets/d/1-aKx4qxKP-cK0Tq5XyMW0G4fa_BBc8go6cWh8kyYydI) |
| space levels | json | space levels | `npm run cosmos` | Jsons/cosmos.json | [sheet](https://docs.google.com/spreadsheets/d/1pWIrnNb7jKis5M0ftDJ9CvAgVUytXaKW41-dquWfS5I) |
| dbtm | json | timeMarks database | `npm run dbtm` | Jsons/dbtm.json | [sheet](https://docs.google.com/spreadsheets/d/1OGOFf6rSTcJCxB9-EVVoeDD6fp9_ZVbqdN9mx2IeUzo) |


## Do NOT edit json files => a) Edit Sheet b) run npm script
npm scripts create files and commit/push

Use `-n` suffix to skip commit/push:  
`npm run dbtm` creates dbtm.json then commits/push  
`npm run dbtm-n` only creates dntm.json
