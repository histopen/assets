const fs = require('fs');
const path = require('path');

const TARGET_DIR = 'c:\\code\\assets\\Icons\\TM_Icons';

function analyzeTransforms(filePath, stats) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const transformMatches = content.match(/transform="([^"]+)"/g);
        
        if (transformMatches) {
            stats.totalFilesWithTransforms++;
            transformMatches.forEach(match => {
                const transform = match.match(/transform="([^"]+)"/)[1];
                if (transform.includes('translate')) stats.translate++;
                if (transform.includes('scale')) stats.scale++;
                if (transform.includes('rotate')) stats.rotate++;
                if (transform.includes('matrix')) stats.matrix++;
                if (transform.includes('skew')) stats.skew++;
            });
        }
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
        totalFilesWithTransforms: 0,
        translate: 0,
        scale: 0,
        rotate: 0,
        matrix: 0,
        skew: 0
    };
    
    let count = 0;
    files.forEach(filename => {
        if (filename.toLowerCase().endsWith('.svg')) {
            const filePath = path.join(TARGET_DIR, filename);
            analyzeTransforms(filePath, stats);
            count++;
        }
    });
            
    console.log(`Analyzed ${count} files.`);
    console.log('Findings:', JSON.stringify(stats, null, 2));
}

main();
