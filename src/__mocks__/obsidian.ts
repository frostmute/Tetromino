export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export type RequestUrlParam = {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
};

export async function requestUrl(_unused: RequestUrlParam): Promise<{
	status: number;
	headers: Record<string, string>;
	json: unknown;
	arrayBuffer: ArrayBuffer;
}> {
	void _unused;
	throw new Error("requestUrl mock not implemented for this test");
}

export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	constructor() {}
}

export class App {
    vault: Vault;
    constructor() {}
}

export class Vault {
    constructor() {}
}
