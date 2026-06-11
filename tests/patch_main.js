const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/main.ts');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { downloadBinaryFile } from "./downloadUtils"')) {
	content = 'import { downloadBinaryFile, validateAttachmentType } from "./downloadUtils";\n' + content;
}

fs.writeFileSync(file, content);
