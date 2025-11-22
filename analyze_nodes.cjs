const fs = require('fs');
const path = require('path');

const TARGET_DIR = 'c:\\code\\assets\\Icons\\TM_Icons';

function analyzeSvg(filePath, stats) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('<metadata')) stats.metadata++;
        if (content.includes('<title')) stats.title++;
        if (content.includes('<desc')) stats.desc++;
        if (content.includes('<!--')) stats.comments++;
        if (content.match(/<g[^>]*>\s*<\/g>/)) stats.emptyGroups++;
        if (content.match(/d="\s*"/)) stats.emptyPaths++;
        if (content.includes('inkscape:')) stats.inkscape++;
        if (content.includes('sodipodi:')) stats.sodipodi++;
        if (content.includes('adobe:')) stats.adobe++;
        if (content.includes('sketch:')) stats.sketch++;
        
    } catch (e) {
        console.error(`Error processing ${filePath}: ${e}`);
    }
}

function main() {
    if (!fs.existsSync(TARGET_DIR)) {
        console.log(`Directory not found: ${TARGET_DIR}`);
        return;
    }

    const files = fs.readdirSync(TARGET_DIR);
    const stats = {
        metadata: 0,
        title: 0,
        desc: 0,
        comments: 0,
        emptyGroups: 0,
        emptyPaths: 0,
        inkscape: 0,
        sodipodi: 0,
        adobe: 0,
        sketch: 0
    };
    
    let count = 0;
    files.forEach(filename => {
        if (filename.toLowerCase().endsWith('.svg')) {
            const filePath = path.join(TARGET_DIR, filename);
            analyzeSvg(filePath, stats);
            count++;
        }
    });
            
    console.log(`Analyzed ${count} files.`);
    console.log('Findings:', JSON.stringify(stats, null, 2));
}

main();
