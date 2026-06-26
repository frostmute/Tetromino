export interface ASTNode {
    type: 'text' | 'var' | 'if' | 'each';
    raw?: string;
    name?: string;
    nameParts?: string[];
    cond?: string;
    condParts?: string[];
    arrayVar?: string;
    arrayVarParts?: string[];
    thenBranch?: ASTNode[];
    elseBranch?: ASTNode[];
}

const parseCache = new Map<string, ASTNode[]>();

export const parseTemplate = (tmpl: string): ASTNode[] => {
    const cached = parseCache.get(tmpl);
    if (cached) {
        return cached;
    }

    const tokens: Array<{ type: 'text' | 'tag'; value: string }> = [];
    let lastIdx = 0;

    while (lastIdx < tmpl.length) {
        const openIdx = tmpl.indexOf('{{', lastIdx);
        if (openIdx === -1) {
            tokens.push({ type: 'text', value: tmpl.substring(lastIdx) });
            break;
        }

        if (openIdx > lastIdx) {
            tokens.push({ type: 'text', value: tmpl.substring(lastIdx, openIdx) });
        }

        const closeIdx = tmpl.indexOf('}}', openIdx + 2);
        if (closeIdx === -1) {
            tokens.push({ type: 'text', value: tmpl.substring(openIdx) });
            break;
        }

        const tagValue = tmpl.substring(openIdx + 2, closeIdx).trim();
        tokens.push({ type: 'tag', value: tagValue });
        lastIdx = closeIdx + 2;
    }

    let tokenIdx = 0;

    const parseNodes = (endTag?: string): ASTNode[] => {
        const nodes: ASTNode[] = [];

        while (tokenIdx < tokens.length) {
            const token = tokens[tokenIdx];
            if (token.type === 'text') {
                nodes.push({ type: 'text', raw: token.value });
                tokenIdx++;
            } else {
                const val = token.value;
                if (endTag && (val === endTag || (endTag === '/if' && val === 'else'))) {
                    break;
                }

                if (val.startsWith('#if ')) {
                    const cond = val.substring(4).trim();
                    tokenIdx++;
                    const thenBranch = parseNodes('/if');
                    let elseBranch: ASTNode[] = [];
                    if (tokenIdx < tokens.length && tokens[tokenIdx].value === 'else') {
                        tokenIdx++;
                        elseBranch = parseNodes('/if');
                    }
                    if (tokenIdx < tokens.length && tokens[tokenIdx].value === '/if') {
                        tokenIdx++;
                    } else if (!elseBranch || (tokenIdx >= tokens.length)) {
                        throw new Error(`Unclosed #if tag (expected {{/if}})`);
                    }
                    nodes.push({ type: 'if', cond, condParts: cond.split('.'), thenBranch, elseBranch });
                } else if (val.startsWith('#each ')) {
                    const arrayVar = val.substring(6).trim();
                    tokenIdx++;
                    const thenBranch = parseNodes('/each');
                    if (tokenIdx < tokens.length && tokens[tokenIdx].value === '/each') {
                        tokenIdx++;
                    } else {
                        throw new Error(`Unclosed #each tag (expected {{/each}})`);
                    }
                    nodes.push({ type: 'each', arrayVar, arrayVarParts: arrayVar.split('.'), thenBranch });
                } else if (val === '/if' || val === '/each' || val === 'else') {
                    // unexpected closing tag — treat as literal text
                    nodes.push({ type: 'text', raw: `{{${val}}}` });
                    tokenIdx++;
                } else {
                    nodes.push({ type: 'var', name: val, nameParts: val.split('.') });
                    tokenIdx++;
                }
            }
        }
        return nodes;
    };

    const ast = parseNodes();
    parseCache.set(tmpl, ast);
    return ast;
};

function getNestedValue(obj: Record<string, unknown>, path: string | string[]): unknown {
    const parts = Array.isArray(path) ? path : path.split('.');
    return parts.reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj);
}

export function renderTemplate(ast: ASTNode[], data: Record<string, unknown>): string {
    const out: string[] = [];
    for (const node of ast) {
        if (node.type === 'text') {
            out.push(node.raw || '');
        } else if (node.type === 'var') {
            const val = getNestedValue(data, node.nameParts || node.name || '');
            if (val !== undefined && val !== null) {
                out.push(String(val));
            }
        } else if (node.type === 'if') {
            const condVal = getNestedValue(data, node.condParts || node.cond || '');
            const isTruthy = Array.isArray(condVal) ? condVal.length > 0 : !!condVal;
            if (isTruthy) {
                out.push(renderTemplate(node.thenBranch || [], data));
            } else if (node.elseBranch) {
                out.push(renderTemplate(node.elseBranch, data));
            }
        } else if (node.type === 'each') {
            const arrayVal = getNestedValue(data, node.arrayVarParts || node.arrayVar || '');
            if (Array.isArray(arrayVal)) {
                for (const item of arrayVal) {
                    out.push(renderTemplate(node.thenBranch || [], (item !== null && typeof item === 'object') ? item as Record<string, unknown> : { this: item }));
                }
            }
        }
    }
    return out.join('');
}
