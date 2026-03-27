import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	TextComponent,
	DropdownComponent,
} from "obsidian";
import type ArenaSyncPlugin from "./main";
import type {
	ChannelMapping,
	ConflictStrategy,
	SyncDirection,
	BlockNamingScheme,
	ImageHandling,
} from "./types";

export class ArenaSyncSettingTab extends PluginSettingTab {
	plugin: ArenaSyncPlugin;

	constructor(app: App, plugin: ArenaSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		/* ---- Header -------------------------------------------------- */
		containerEl.createEl("h1", { text: "Are.na Sync" });
		containerEl.createEl("p", {
			text: "Connect your Are.na channels to folders in this vault.",
			cls: "setting-item-description",
		});

		/* ---- Authentication ------------------------------------------ */
		containerEl.createEl("h2", { text: "Authentication" });

		new Setting(containerEl)
			.setName("API token")
			.setDesc(
				"Generate a personal access token at https://dev.are.na/oauth/applications"
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter your Are.na token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value.trim();
						await this.plugin.saveSettings();
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Verify").onClick(async () => {
					const ok = await this.plugin.api.verifyToken();
					new Notice(ok ? "✓ Token is valid" : "✗ Invalid token");
				})
			);

		/* ---- Sync behaviour ------------------------------------------ */
		containerEl.createEl("h2", { text: "Sync behaviour" });

		new Setting(containerEl)
			.setName("Sync interval")
			.setDesc("Minutes between automatic syncs (0 = manual only)")
			.addText((text) =>
				text
					.setPlaceholder("30")
					.setValue(String(this.plugin.settings.syncInterval))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						if (!isNaN(n) && n >= 0) {
							this.plugin.settings.syncInterval = n;
							await this.plugin.saveSettings();
							this.plugin.resetSyncTimer();
						}
					})
			);

		new Setting(containerEl)
			.setName("Sync on startup")
			.setDesc("Run a full sync when Obsidian starts")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.syncOnStartup)
					.onChange(async (value) => {
						this.plugin.settings.syncOnStartup = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default sync direction")
			.addDropdown((dd) =>
				dd
					.addOptions({
						pull: "Pull (Are.na → Obsidian)",
						push: "Push (Obsidian → Are.na)",
						both: "Two-way",
					} as Record<SyncDirection, string>)
					.setValue(this.plugin.settings.defaultSyncDirection)
					.onChange(async (value) => {
						this.plugin.settings.defaultSyncDirection =
							value as SyncDirection;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Conflict strategy")
			.addDropdown((dd) =>
				dd
					.addOptions({
						"local-wins": "Local wins",
						"remote-wins": "Remote wins",
						"newest-wins": "Newest wins",
						ask: "Ask each time",
					} as Record<ConflictStrategy, string>)
					.setValue(this.plugin.settings.conflictStrategy)
					.onChange(async (value) => {
						this.plugin.settings.conflictStrategy =
							value as ConflictStrategy;
						await this.plugin.saveSettings();
					})
			);

		/* ---- Content ------------------------------------------------- */
		containerEl.createEl("h2", { text: "Content" });

		new Setting(containerEl)
			.setName("Block file naming")
			.addDropdown((dd) =>
				dd
					.addOptions({
						title: "Block title",
						id: "Block ID",
						"title-id": "Title (ID)",
					} as Record<BlockNamingScheme, string>)
					.setValue(this.plugin.settings.blockNaming)
					.onChange(async (value) => {
						this.plugin.settings.blockNaming =
							value as BlockNamingScheme;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Image handling")
			.addDropdown((dd) =>
				dd
					.addOptions({
						download: "Download to vault",
						embed: "Obsidian embed (local)",
						link: "External link",
					} as Record<ImageHandling, string>)
					.setValue(this.plugin.settings.imageHandling)
					.onChange(async (value) => {
						this.plugin.settings.imageHandling =
							value as ImageHandling;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Add front-matter")
			.setDesc("Include YAML front-matter with Are.na metadata")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.frontmatterEnabled)
					.onChange(async (value) => {
						this.plugin.settings.frontmatterEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		/* ---- Notifications ------------------------------------------- */
		containerEl.createEl("h2", { text: "Notifications" });

		new Setting(containerEl)
			.setName("Show sync notifications")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.notifyOnSync)
					.onChange(async (value) => {
						this.plugin.settings.notifyOnSync = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Debug logging")
			.setDesc("Log API requests and sync details to the console")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.debugLogging)
					.onChange(async (value) => {
						this.plugin.settings.debugLogging = value;
						await this.plugin.saveSettings();
					})
			);

		/* ---- Channel mappings ---------------------------------------- */
		containerEl.createEl("h2", { text: "Channel mappings" });

		new Setting(containerEl)
			.setName("Add channel")
			.setDesc("Map an Are.na channel to a local folder")
			.addButton((btn) =>
				btn.setButtonText("+ Add mapping").onClick(() => {
					this.plugin.settings.channelMappings.push({
						channelSlug: "",
						channelId: 0,
						channelTitle: "",
						localFolder: "",
						syncDirection: this.plugin.settings.defaultSyncDirection,
						lastSyncedAt: null,
						enabled: true,
					});
					this.display(); // re-render
				})
			);

		for (let i = 0; i < this.plugin.settings.channelMappings.length; i++) {
			this.renderMapping(containerEl, i);
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Mapping row                                                       */
	/* ------------------------------------------------------------------ */

	private renderMapping(containerEl: HTMLElement, index: number): void {
		const mapping = this.plugin.settings.channelMappings[index];
		const wrapper = containerEl.createDiv({ cls: "arena-mapping-row" });

		new Setting(wrapper)
			.setName(`Mapping #${index + 1}`)
			.setDesc(
				mapping.lastSyncedAt
					? `Last synced ${new Date(mapping.lastSyncedAt).toLocaleString()}`
					: "Never synced"
			)
			.addText((text) =>
				text
					.setPlaceholder("channel-slug")
					.setValue(mapping.channelSlug)
					.onChange(async (v) => {
						mapping.channelSlug = v.trim();
						await this.plugin.saveSettings();
					})
			)
			.addText((text) =>
				text
					.setPlaceholder("Vault/Folder")
					.setValue(mapping.localFolder)
					.onChange(async (v) => {
						mapping.localFolder = v.trim();
						await this.plugin.saveSettings();
					})
			)
			.addToggle((toggle) =>
				toggle.setValue(mapping.enabled).onChange(async (v) => {
					mapping.enabled = v;
					await this.plugin.saveSettings();
				})
			)
			.addButton((btn) =>
				btn
					.setButtonText("Remove")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.channelMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}
