// This is a debug script to help understand how ~ expansion works
import os from 'os';
import path from 'path';
function expandHome(filepath) {
    console.log(`Expanding ${filepath}`);
    // Handle both '~' alone or '~/' path prefix
    if (filepath === '~') {
        const home = os.homedir();
        console.log(`~ expanded to ${home}`);
        return home;
    }
    else if (filepath.startsWith('~/')) {
        const joinedPath = path.join(os.homedir(), filepath.slice(2));
        console.log(`~/ expanded to ${joinedPath}`);
        return joinedPath;
    }
    return filepath;
}
console.log(`Home directory: ${os.homedir()}`);
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Expanding ~: ${expandHome('~')}`);
console.log(`Expanding ~/Documents: ${expandHome('~/Documents')}`);
console.log(`Expanding /tmp: ${expandHome('/tmp')}`);
// Create lowercase normalized paths for comparison
function normalizePath(p) {
    return path.normalize(p).toLowerCase();
}
const allowedDir = '~';
const expandedAllowedDir = expandHome(allowedDir);
const normalizedAllowedDir = normalizePath(expandedAllowedDir);
console.log(`Allowed dir: ${allowedDir}`);
console.log(`Expanded allowed dir: ${expandedAllowedDir}`);
console.log(`Normalized allowed dir: ${normalizedAllowedDir}`);
// Example path to check
const pathToCheck = '~';
const expandedPathToCheck = expandHome(pathToCheck);
const normalizedPathToCheck = normalizePath(expandedPathToCheck);
console.log(`Path to check: ${pathToCheck}`);
console.log(`Expanded path to check: ${expandedPathToCheck}`);
console.log(`Normalized path to check: ${normalizedPathToCheck}`);
// Check if path is allowed
const isAllowed = normalizedPathToCheck === normalizedAllowedDir ||
    normalizedPathToCheck.startsWith(normalizedAllowedDir + path.sep);
console.log(`Is path allowed: ${isAllowed}`);
