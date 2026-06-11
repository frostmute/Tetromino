const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/utils.ts');
let content = fs.readFileSync(file, 'utf8');

const originalFunc = `export function blockToMarkdown(
	block: ArenaBlock,
	settings: ArenaSyncSettings,
	context: MarkdownContext = {}
): string {`;

const newFunc = `export function blockToMarkdown(
	block: ArenaBlock,
	settings: ArenaSyncSettings,
	context: MarkdownContext = {}
): string {
	if (settings.templateEnabled && settings.templateString) {
		const ast = parseTemplate(settings.templateString);
		const vars: Record<string, any> = {
			id: block.id,
			title: block.title ?? \`Block \${block.id}\`,
			class: block.class,
			arena_url: \`https://www.are.na/block/\${block.id}\`,
			description: block.description || "",
			created_at: block.created_at,
			updated_at: block.updated_at,
			source_url: block.source?.url ? normalizeArenaUrl(block.source.url) : "",
			channel_slug: context.channelSlug || "",
			channel_title: context.channelTitle || ""
		};
		
		let contentPart = "";
		switch (block.class) {
			case "Text":
				contentPart = block.content ?? "";
				break;
			case "Link":
				if (block.source?.url) {
					contentPart = \`[\${block.source.title || block.source.url}](\${normalizeArenaUrl(block.source.url)})\`;
				}
				break;
			case "Media":
				if (block.source?.url) {
					contentPart = \`<\${normalizeArenaUrl(block.source.url)}>\`;
				}
				break;
			case "Attachment":
				if (block.attachment) {
					if (context.assetPath && settings.attachmentHandling === "download") {
						if (settings.downloadedAttachmentLinkStyle === "embed") {
							contentPart = \`![[\${context.assetPath}]]\`;
						} else {
							contentPart = \`[[\${context.assetPath}|\${block.attachment.file_name}]]\`;
						}
					} else {
						contentPart = \`[\${block.attachment.file_name}](\${block.attachment.url})\`;
					}
				}
				break;
		}
		vars.content = contentPart;

		if (block.class === "Image" && block.image) {
			const embedUrl = resolveImageEmbedUrl(block);
			if (settings.imageHandling === "download" && context.assetPath) {
				vars.image = \`[[\${context.assetPath}]]\`;
			} else if (settings.imageHandling === "embed" && embedUrl) {
				vars.image = embedUrl;
			} else if (embedUrl) {
				vars.image = embedUrl;
			}
		} else if (context.bodyImageUrl) {
			vars.image = context.bodyImageUrl;
		}

		if (settings.bannerFieldEnabled) {
			const bannerValue = context.bannerImageUrl || resolveBlockBannerUrlWithPriority(block, settings.bannerImagePriority);
			if (bannerValue) {
				vars[settings.bannerFieldName.trim() || "banner"] = bannerValue;
			}
		}

		const rendered = renderTemplate(ast, vars);
		return sanitizeMarkdownContent(rendered);
	}

	// Legacy hardcoded logic
`;

content = content.replace(originalFunc, newFunc);
fs.writeFileSync(file, content);
