/**
 * Security utilities for Tetromino
 */

/**
 * Sanitizes markdown content to prevent XSS and arbitrary code execution
 * when rendered in Obsidian. It preserves intended Markdown formatting
 * but neutralizes dangerous HTML, scripts, and plugin-specific executable blocks.
 *
 * @param content The raw string content to sanitize
 * @returns Sanitized string safe to render in Obsidian
 */
const EXECUTABLE_BLOCKS = [
    'dataviewjs', 'dataview', 'templater', 'js', 'javascript',
    'ts', 'typescript', 'button', 'meta-bind', 'tracker', 'charts',
    'obsidian-js', 'dv'
];
const BLOCKS_PATTERN = EXECUTABLE_BLOCKS.join('|');
const BLOCK_REGEX = new RegExp(`\`\`\`(${BLOCKS_PATTERN})`, 'gi');

const DANGEROUS_TAGS = [
    'meta', 'base', 'link', 'form', 'button', 'input', 'select', 'textarea', 'svg', 'math'
];
const DANGEROUS_TAGS_PATTERN = DANGEROUS_TAGS.join('|');
const DANGEROUS_TAGS_REGEX = new RegExp(`<(?:\\/\\s*)?(?:${DANGEROUS_TAGS_PATTERN})(?:\\s+[^>]*)?>`, 'gi');

export function sanitizeMarkdownContent(content: unknown): string {
    if (typeof content !== 'string') {
        if (content === null || content === undefined) return '';
        return typeof content === 'object' ? JSON.stringify(content) : String(content);
    }

    let sanitized = content;

    // 1. Prevent execution of active code blocks (e.g. dataview, templater, inline scripts)
    // We prefix the language name with a zero-width space (\u200B) to break the trigger
    sanitized = sanitized.replace(BLOCK_REGEX, '```\u200B$1');

    // 2. Neutralize inline execution engines (Templater, Dataview inline, etc.)
    // Templater: <% ... %>
    sanitized = sanitized.replace(/<%/g, '&lt;%').replace(/%>/g, '%&gt;');
    // Dataview inline: `= ...` or `$= ...`
    sanitized = sanitized.replace(/`\$=/g, '`$\u200B=');
    sanitized = sanitized.replace(/`=/g, '`\u200B=');

    // 3. Strip out entirely dangerous HTML tags (including their content where possible)
    sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '');
    sanitized = sanitized.replace(/<applet\b[^>]*>[\s\S]*?<\/applet>/gi, '');

    // Strip out remaining dangerous HTML tags (self-closing or empty)
    sanitized = sanitized.replace(DANGEROUS_TAGS_REGEX, '');

    // 4. Remove inline event handlers (onerror, onclick, etc.) from ANY remaining HTML tags
    sanitized = sanitized.replace(/\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

    // 5. Neutralize dangerous URL protocols in markdown links/images and HTML attributes
    // First decode all HTML entities, then check for dangerous protocols
    sanitized = sanitized.replace(/(?:[a-zA-Z]|&#[0-9]+;|&#x[0-9a-fA-F]+;|&[a-zA-Z]+;)+\s*:/gi, (match) => {
        const decoded = decodeAllHTMLEntities(match);
        if (/^\s*(javascript|vbscript|data)\s*:/i.test(decoded)) {
            return decoded.replace(/(javascript|vbscript|data)\s*:/i, '$1\\:');
        }
        return match;
    });

    return sanitized;
}

const NAMED_ENTITIES: Record<string, string> = {
    '&colon;': ':',
    '&tab;': '\t',
    '&newline;': '\n',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
};

/**
 * Decodes all HTML entities in a string for security validation.
 * This handles numeric (&#58;), hex (&#x3a;), and named (&colon;) entities.
 */
function decodeAllHTMLEntities(str: string): string {
    return str.replace(/&#x([0-9a-fA-F]+);|&#([0-9]+);|&([a-zA-Z]+);/gi, (match, hex, dec, named) => {
        if (hex) return String.fromCharCode(parseInt(hex, 16));
        if (dec) return String.fromCharCode(parseInt(dec, 10));
        if (named) {
            const key = `&${named.toLowerCase()};`;
            return NAMED_ENTITIES[key] ?? match;
        }
        return match;
    });
}
