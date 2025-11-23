const fs = require('fs');
const path = require('path');

const TARGET_DIR = 'c:\\code\\assets\\Icons\\TM_Icons';

// Simple path parser/serializer
// This is not a full SVG path parser but handles standard commands found in these files
function parsePath(d) {
    const commands = [];
    const regex = /([a-zA-Z])|([-+]?\d*\.?\d+)/g;
    let match;
    let currentCommand = null;
    
    while ((match = regex.exec(d)) !== null) {
        if (match[1]) { // Command letter
            currentCommand = { type: match[1], args: [] };
            commands.push(currentCommand);
        } else if (match[2]) { // Number
            if (currentCommand) {
                currentCommand.args.push(parseFloat(match[2]));
            }
        }
    }
    return commands;
}

function serializePath(commands) {
    return commands.map(cmd => {
        // Round to 1 decimal place as per previous optimization
        const args = cmd.args.map(n => parseFloat(n.toFixed(1)).toString().replace(/\.0$/, ''));
        return cmd.type + args.join(' ');
    }).join('');
}

function applyTranslate(commands, dx, dy) {
    let currentX = 0;
    let currentY = 0;
    
    // We only need to shift ABSOLUTE coordinates.
    // Relative coordinates (lowercase commands) don't change with translation!
    // EXCEPT for the very first Move command (M/m) which is always absolute-ish.
    // Actually, 'm' (lowercase) at start is treated as absolute.
    
    commands.forEach((cmd, index) => {
        const type = cmd.type;
        const args = cmd.args;
        
        // Uppercase = Absolute
        if (type === type.toUpperCase()) {
            // M, L, T: x y
            if (['M', 'L', 'T'].includes(type)) {
                for (let i = 0; i < args.length; i += 2) {
                    args[i] += dx;
                    args[i+1] += dy;
                }
            }
            // H: x
            else if (type === 'H') {
                for (let i = 0; i < args.length; i++) args[i] += dx;
            }
            // V: y
            else if (type === 'V') {
                for (let i = 0; i < args.length; i++) args[i] += dy;
            }
            // C: x1 y1 x2 y2 x y
            else if (type === 'C') {
                for (let i = 0; i < args.length; i += 6) {
                    args[i] += dx; args[i+1] += dy;
                    args[i+2] += dx; args[i+3] += dy;
                    args[i+4] += dx; args[i+5] += dy;
                }
            }
            // S, Q: x1 y1 x y
            else if (['S', 'Q'].includes(type)) {
                for (let i = 0; i < args.length; i += 4) {
                    args[i] += dx; args[i+1] += dy;
                    args[i+2] += dx; args[i+3] += dy;
                }
            }
            // A: rx ry x-axis-rotation large-arc-flag sweep-flag x y
            else if (type === 'A') {
                for (let i = 0; i < args.length; i += 7) {
                    args[i+5] += dx;
                    args[i+6] += dy;
                }
            }
        } else {
            // Lowercase = Relative
            // Special case: First command is 'm', it's treated as absolute
            if (index === 0 && type === 'm') {
                 args[0] += dx;
                 args[1] += dy;
            }
        }
    });
}

function bakeTransforms(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Find transform="translate(x y)" or translate(x, y)
        // We assume it's on a group wrapping the path, or on the path itself.
        // Based on previous files: <g transform="translate(-22 -362)"><path ...
        
        const transformRegex = /transform="translate\(\s*([-+]?\d*\.?\d+)[,\s]+\s*([-+]?\d*\.?\d+)\s*\)"/;
        const match = content.match(transformRegex);
        
        if (match) {
            const dx = parseFloat(match[1]);
            const dy = parseFloat(match[2]);
            
            // Find path d="..."
            const pathRegex = /d="([^"]+)"/;
            const pathMatch = content.match(pathRegex);
            
            if (pathMatch) {
                const originalPath = pathMatch[1];
                const commands = parsePath(originalPath);
                
                applyTranslate(commands, dx, dy);
                
                const newPath = serializePath(commands);
                
                // Replace path data
                content = content.replace(originalPath, newPath);
                
                // Remove transform attribute
                content = content.replace(match[0], '');
                
                // Clean up empty group if it was <g transform...><path.../></g>
                // We can just remove the <g> and </g> tags if they have no other attributes?
                // The previous regex removed the attribute, so now we have <g >...
                content = content.replace(/<g\s*>/, '');
                content = content.replace(/<\/g>/, '');
                
                // Cleanup extra spaces
                content = content.replace(/\s+/, ' ');

                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Baked transform (${dx}, ${dy}) into ${path.basename(filePath)}`);
            }
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
    let count = 0;
    
    files.forEach(filename => {
        if (filename.toLowerCase().endsWith('.svg')) {
            const filePath = path.join(TARGET_DIR, filename);
            bakeTransforms(filePath);
            count++;
        }
    });
            
    console.log(`Processed ${count} files.`);
}

main();
