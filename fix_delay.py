import re

with open('src/api.ts', 'r') as f:
    content = f.read()

search = """	private async fetchPageWithRetries(
		slug: string,
		pageNumber: number,
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		let consecutiveErrors = 0;
		const MAX_CONSECUTIVE_ERRORS = 3;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			try {
				if (pageNumber > 1 || consecutiveErrors > 0) {
					const delayMultiplier = Math.max(1, consecutiveErrors);
					await delay(REQUEST_DELAY * delayMultiplier + withJitter(JITTER));
				}
				const page = await this.getChannelContents(slug, pageNumber);
				return page;
			} catch (error) {"""

replace = """	private async fetchPageWithRetries(
		slug: string,
		pageNumber: number,
	): Promise<ArenaPaginatedResponse<ArenaBlock>> {
		let consecutiveErrors = 0;
		const MAX_CONSECUTIVE_ERRORS = 3;

		// eslint-disable-next-line no-constant-condition
		while (true) {
			try {
				if (pageNumber > 1 && consecutiveErrors === 0) {
					await delay(withJitter(REQUEST_DELAY));
				}
				const page = await this.getChannelContents(slug, pageNumber);
				return page;
			} catch (error) {"""

if search in content:
    with open('src/api.ts', 'w') as f:
        f.write(content.replace(search, replace))
    print("Success 1")
else:
    print("Search string 1 not found")

search2 = """				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					throw new Error(
						`Failed to fetch channel ${slug} after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. ` +
							`Last error: ${(error as Error).message}`,
					);
				}
			}
		}
	}"""

replace2 = """				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					throw new Error(
						`Failed to fetch channel ${slug} after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. ` +
							`Last error: ${(error as Error).message}`,
					);
				}

				await delay(
					REQUEST_DELAY * consecutiveErrors + withJitter(JITTER),
				);
			}
		}
	}"""

with open('src/api.ts', 'r') as f:
    content2 = f.read()

if search2 in content2:
    with open('src/api.ts', 'w') as f:
        f.write(content2.replace(search2, replace2))
    print("Success 2")
else:
    print("Search string 2 not found")
