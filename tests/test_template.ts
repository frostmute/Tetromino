import { parseTemplate, renderTemplate } from '../src/templateUtils';
const tmpl = `
# {{title}}
{{#if description}}
> {{description}}
{{/if}}
`;
const vars = { title: "Hello", description: "World" };
const ast = parseTemplate(tmpl);
console.log(renderTemplate(ast, vars));
