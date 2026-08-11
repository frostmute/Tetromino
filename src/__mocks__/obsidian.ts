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
	static instances: Notice[] = [];
	message: string;
	constructor(message: string) {
		Notice.instances.push(this);
		this.message = message;
	}
}

export class Plugin {
	app: App;
	manifest: PluginManifest;
	constructor(app: App, manifest: PluginManifest) {
		this.app = app;
		this.manifest = manifest;
	}
	async loadData(): Promise<unknown> {
		return {};
	}
	async saveData(_data: unknown): Promise<void> {
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

export type PluginManifest = {
	id: string;
	name: string;
	version: string;
	minAppVersion: string;
	description?: string;
	author?: string;
	authorUrl?: string;
	isDesktopOnly?: boolean;
};

export class PluginSettingTab<P extends Plugin = Plugin> {
	app: App;
	plugin: P;
	containerEl: HTMLElement;
	constructor(app: App, plugin: P) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
	display(): void {}
	update(): void {}
}

type SettingCtor<T> = (component: T) => void;

export type TextComponentLike = {
	value: string;
	placeholder: string;
	inputEl: { type: string };
	setValue(v: string): unknown;
	setPlaceholder(p: string): unknown;
	onChange(fn: (v: string) => unknown): unknown;
	onChangeFn?: (v: string) => unknown;
};

export class Setting {
	static textComponents: TextComponentLike[] = [];
	constructor(_containerEl: HTMLElement) {
		void _containerEl;
	}
	setName<T extends string>(_name: T): this {
		void _name;
		return this;
	}
	setHeading(): this {
		return this;
	}
	setDesc(_desc: string): this {
		void _desc;
		return this;
	}
	addText(cb: SettingCtor<TextComponentLike>): this {
		const component: TextComponentLike = {
			value: "",
			placeholder: "",
			inputEl: { type: "text" },
			setValue(v: string) {
				component.value = v;
				return component;
			},
			setPlaceholder(p: string) {
				component.placeholder = p;
				return component;
			},
			onChange(fn: (v: string) => unknown) {
				component.onChangeFn = fn;
				return component;
			},
		};
		Setting.textComponents.push(component);
		cb(component);
		return this;
	}
	addToggle(cb: SettingCtor<{ setValue(v: boolean): unknown; onChange(fn: (v: boolean) => unknown): unknown }>): this {
		void cb;
		return this;
	}
	addDropdown<T extends string>(cb: SettingCtor<{ addOptions(opts: Record<string, string>): unknown; setValue(v: T): unknown; onChange(fn: (v: T) => unknown): unknown }>): this {
		void cb;
		return this;
	}
	addButton(cb: SettingCtor<{ setButtonText(t: string): unknown; setWarning(): unknown; setDestructive(): unknown; setCta(): unknown; setDisabled(d: boolean): unknown; onClick(fn: () => unknown): unknown }>): this {
		void cb;
		return this;
	}
}

export class FuzzySuggestModal<T> {
	app: App;
	constructor(app: App) {
		this.app = app;
	}
	setPlaceholder(_placeholder: string): this {
		void _placeholder;
		return this;
	}
	getItems(): T[] {
		return [];
	}
	getItemText(_item: T): string {
		void _item;
		return "";
	}
	onChooseItem(_item: T, _evt: MouseEvent | KeyboardEvent): void {
		void _item;
		void _evt;
	}
	open(): void {}
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

export function addIcon(): void {}
