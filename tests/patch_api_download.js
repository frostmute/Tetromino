const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/api.ts');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('downloadBinaryFile')) {
	content = 'import { downloadBinaryFile } from "./downloadUtils";\n' + content;
}

const originalMethod = `	async downloadBinary(url: string): Promise<ArrayBuffer> {
		let attempts = 0;

		while (attempts < MAX_RETRIES) {
			let res;
			try {
				res = await requestUrl({
					url,
					method: "GET",
					headers: {},
				});
				return res.arrayBuffer;
			} catch (e: any) {
				const status = asNumber(e.status);
				if (status === RATE_LIMIT_STATUS) {
					this.log(\`Rate limited downloading \${url}, retrying...\`);
					await delay(transientBackoffMs(attempts));
					attempts++;
					continue;
				}
				if (status && TRANSIENT_STATUSES.has(status)) {
					this.log(\`Transient error \${status} downloading \${url}, retrying...\`);
					await delay(transientBackoffMs(attempts));
					attempts++;
					continue;
				}
				throw e;
			}
		}
		throw new Error(\`Failed to download \${url} after \${MAX_RETRIES} attempts\`);
	}`;

const newMethod = `	async downloadBinary(url: string): Promise<ArrayBuffer> {
		const res = await downloadBinaryFile(url, this.token);
		if (res.status >= 400 || res.error) {
			throw new Error(res.error || \`Download failed with status \${res.status}\`);
		}
		if (!res.arrayBuffer) {
			throw new Error("No data returned from download");
		}
		return res.arrayBuffer;
	}`;

content = content.replace(originalMethod, newMethod);
fs.writeFileSync(file, content);
