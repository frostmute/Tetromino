const fs = require('fs');
const path = require('path');

const arenaApiUtils = path.join(__dirname, '../src/arenaApiUtils.ts');
let aauContent = fs.readFileSync(arenaApiUtils, 'utf8');
aauContent = aauContent.replace(/import { App, requestUrl, RequestUrlParam } from 'obsidian';/, "import { requestUrl } from 'obsidian';");
aauContent = aauContent.replace(/variables: Record<string, any>/, "variables: Record<string, unknown>");
fs.writeFileSync(arenaApiUtils, aauContent);

const templateUtils = path.join(__dirname, '../src/templateUtils.ts');
let tuContent = fs.readFileSync(templateUtils, 'utf8');
tuContent = tuContent.replace(/getNestedValue\(obj: Record<string, any>, path: string\): any/, "getNestedValue(obj: Record<string, unknown>, path: string): unknown");
tuContent = tuContent.replace(/data: Record<string, any>/, "data: Record<string, unknown>");
fs.writeFileSync(templateUtils, tuContent);

const utilsTs = path.join(__dirname, '../src/utils.ts');
let uContent = fs.readFileSync(utilsTs, 'utf8');
uContent = uContent.replace(/const vars: Record<string, any> = {/, "const vars: Record<string, unknown> = {");
uContent = uContent.replace(/import { formatYamlValue } from ".\/yamlUtils";\n/, "");
fs.writeFileSync(utilsTs, uContent);

const mainTs = path.join(__dirname, '../src/main.ts');
let mainContent = fs.readFileSync(mainTs, 'utf8');
mainContent = mainContent.replace(/import { downloadBinaryFile } from "\.\/downloadUtils";\n/, "");
fs.writeFileSync(mainTs, mainContent);

const apiTs = path.join(__dirname, '../src/api.ts');
let apiContent = fs.readFileSync(apiTs, 'utf8');
apiContent = apiContent.replace(/import { downloadBinaryFile } from "\.\/downloadUtils";\n/, "");
fs.writeFileSync(apiTs, apiContent);

const yamlTs = path.join(__dirname, '../src/yamlUtils.ts');
let yamlContent = fs.readFileSync(yamlTs, 'utf8');
yamlContent = yamlContent.replace(/\/\* eslint-disable sentence-case\/sentence-case \*\//g, "");
yamlContent = yamlContent.replace(/\/\/ eslint-disable-next-line sentence-case\/sentence-case/g, "");
fs.writeFileSync(yamlTs, yamlContent);

