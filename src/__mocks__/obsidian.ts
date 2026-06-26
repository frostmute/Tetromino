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

export class Notice {
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}

export class Plugin {
	app: App;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	manifest: any;
	constructor(app: App, manifest: unknown) {
		this.app = app;
		this.manifest = manifest;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async loadData(): Promise<any> {
		return {};
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async saveData(_data: any): Promise<void> {
		void _data;
	}
	addSettingTab(): void {}
	addCommand(): void {}
	addRibbonIcon(): HTMLElement {
		return document.createElement("div");
	}
	addStatusBarItem(): HTMLElement {
		return document.createElement("div");
	}
	registerInterval(interval: number): number {
		return interval;
	}
}

export class PluginSettingTab {
	app: App;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	plugin: any;
	containerEl: HTMLElement;
	constructor(app: App, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
	display(): void {}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;
	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}
	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class Setting {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(_containerEl: any) {
		void _containerEl;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setName(_name: any): this {
		void _name;
		return this;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setDesc(_desc: any): this {
		void _desc;
		return this;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addText(_cb: any): this {
		void _cb;
		return this;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addToggle(_cb: any): this {
		void _cb;
		return this;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addDropdown(_cb: any): this {
		void _cb;
		return this;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	addButton(_cb: any): this {
		void _cb;
		return this;
	}
}

export function addIcon(): void {}
