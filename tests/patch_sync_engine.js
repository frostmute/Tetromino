const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/sync-engine.ts');
let content = fs.readFileSync(file, 'utf8');

const oldFunc = `		let blocks: ArenaBlock[] = [];
		let page = 1;
		let totalPages = 1;
		do {
			const res = await this.api.getChannelBlocks(mapping.channelSlug, page, 100) as any;
			if (res && Array.isArray(res)) {
				// the api returns contents directly from getChannelBlocks due to the wrapper
				blocks = blocks.concat(res);
				totalPages = 1; // Since we bypassed the paginated wrapper temporarily
			}
			this.onProgress?.({
				channelSlug: mapping.channelSlug,
				phase: "pages",
				current: page,
				total: totalPages,
			});
			page++;
		} while (page <= totalPages);`;

const newFunc = `		const blocks = await this.api.getAllChannelBlocksWithProgress(
			mapping.channelSlug,
			(currentPage: number, totalPages: number) => {
				this.onProgress?.({
					channelSlug: mapping.channelSlug,
					phase: "pages",
					current: currentPage,
					total: totalPages,
				});
			},
		);`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync(file, content);
