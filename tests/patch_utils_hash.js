const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/utils.ts');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { createHash } from "crypto"')) {
	content = 'import { createHash } from "crypto";\n' + content;
}

fs.writeFileSync(file, content);

const mainFile = path.join(__dirname, '../src/main.ts');
let mainContent = fs.readFileSync(mainFile, 'utf8');
mainContent = mainContent.replace(', validateAttachmentType', '');
fs.writeFileSync(mainFile, mainContent);

