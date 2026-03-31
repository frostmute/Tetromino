import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ArenaSyncPlugin from "./main";
import type {
	AttachmentHandling,
	AttachmentStorage,
	BannerImagePriority,
	BlockNamingScheme,
	DownloadedAttachmentLinkStyle,
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
		containerEl.addClass("arena-sync-settings");

		containerEl.createEl("h1", { text: "Are.na Import" });
		containerEl.createEl("p", {
			text: "One-way import from Are.na into this vault.",
			cls: "setting-item-description",
		});

		containerEl.createEl("h2", { text: "Authentication" });
		new Setting(containerEl)
			.setName("API token")
			.setDesc(
				"Generate a token at https://dev.are.na/oauth/applications",
			)
			.addText((text) => {
				text.setPlaceholder("Enter your Are.na token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.type = "password";
				return text;
			})
			.addButton((btn) =>
				btn.setButtonText("Verify").onClick(async () => {
					if (!this.plugin.settings.apiToken) {
						new Notice("Please enter an API token first");
						return;
					}
					const ok = await this.plugin.api.verifyToken();
					new Notice(ok ? "Token is valid" : "Invalid token");
				}),
			);

		containerEl.createEl("h2", { text: "Content rendering" });
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
					}),
			);

		new Setting(containerEl)
			.setName("Banner frontmatter field")
			.setDesc("Add optional banner URL field for Obsidian Banners plugin")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.bannerFieldEnabled)
					.onChange(async (value) => {
						this.plugin.settings.bannerFieldEnabled = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.bannerFieldEnabled) {
			new Setting(containerEl)
				.setName("Banner field name")
				.setDesc("Frontmatter key used for banner URL")
				.addText((text) =>
					text
						.setPlaceholder("banner")
						.setValue(this.plugin.settings.bannerFieldName)
						.onChange(async (value) => {
							this.plugin.settings.bannerFieldName =
								value.trim() || "banner";
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Banner image source priority")
				.setDesc("Choose thumbnail or display image as preferred banner URL")
				.addDropdown((dd) =>
					dd
						.addOptions({
							"thumb-first": "Thumb first",
							"display-first": "Display first",
						} as Record<BannerImagePriority, string>)
						.setValue(this.plugin.settings.bannerImagePriority)
						.onChange(async (value) => {
							this.plugin.settings.bannerImagePriority =
								value as BannerImagePriority;
							await this.plugin.saveSettings();
						}),
				);
		}

		new Setting(containerEl)
			.setName("Image handling")
			.setDesc("How image blocks are rendered")
			.addDropdown((dd) =>
				dd
					.addOptions({
						download: "Download to vault",
						embed: "Embed reference",
						link: "External link",
					} as Record<ImageHandling, string>)
					.setValue(this.plugin.settings.imageHandling)
					.onChange(async (value) => {
						this.plugin.settings.imageHandling =
							value as ImageHandling;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Attachment handling")
			.setDesc("For PDFs and other non-image attachments")
			.addDropdown((dd) =>
				dd
					.addOptions({
						download: "Download to vault",
						link: "External link",
					} as Record<AttachmentHandling, string>)
					.setValue(this.plugin.settings.attachmentHandling)
					.onChange(async (value) => {
						this.plugin.settings.attachmentHandling =
							value as AttachmentHandling;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Downloaded attachment render")
			.setDesc("When attachments are downloaded locally")
			.addDropdown((dd) =>
				dd
					.addOptions({
						link: "Link",
						embed: "Embed",
					} as Record<DownloadedAttachmentLinkStyle, string>)
					.setValue(
						this.plugin.settings.downloadedAttachmentLinkStyle,
					)
					.onChange(async (value) => {
						this.plugin.settings.downloadedAttachmentLinkStyle =
							value as DownloadedAttachmentLinkStyle;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Attachment storage location")
			.addDropdown((dd) =>
				dd
					.addOptions({
						channel: "With channel notes",
						global: "Global folder",
						custom: "Custom folder",
					} as Record<AttachmentStorage, string>)
					.setValue(this.plugin.settings.attachmentStorage)
					.onChange(async (value) => {
						this.plugin.settings.attachmentStorage =
							value as AttachmentStorage;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName("Global attachment folder")
			.setDesc("Used when storage location is Global folder")
			.addText((text) =>
				text
					.setPlaceholder("Are.na/Attachments")
					.setValue(this.plugin.settings.globalAttachmentFolder)
					.onChange(async (value) => {
						this.plugin.settings.globalAttachmentFolder =
							value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Custom attachment folder")
			.setDesc("Used when storage location is Custom folder")
			.addText((text) =>
				text
					.setPlaceholder("Path/In/Vault")
					.setValue(this.plugin.settings.customAttachmentFolder)
					.onChange(async (value) => {
						this.plugin.settings.customAttachmentFolder =
							value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Add frontmatter")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.frontmatterEnabled)
					.onChange(async (value) => {
						this.plugin.settings.frontmatterEnabled = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Exclude block classes")
			.setDesc(
				"Comma-separated list of block types to skip (e.g., Image, Media)",
			)
			.addText((text) =>
				text
					.setPlaceholder("Image, Media")
					.setValue(this.plugin.settings.excludeClasses.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.excludeClasses = value
							.split(",")
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h2", { text: "Notifications and logging" });
		new Setting(containerEl)
			.setName("Show notifications")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.notifyOnSync)
					.onChange(async (value) => {
						this.plugin.settings.notifyOnSync = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName("Debug logging").addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.debugLogging)
				.onChange(async (value) => {
					this.plugin.settings.debugLogging = value;
					await this.plugin.saveSettings();
				}),
		);

		containerEl.createEl("h2", { text: "Channel mappings" });
		new Setting(containerEl)
			.setName("Add channel")
			.setDesc("Map an Are.na channel slug to a local folder")
			.addButton((btn) =>
				btn.setButtonText("+ Add mapping").onClick(async () => {
					this.plugin.settings.channelMappings.push({
						channelSlug: "",
						channelId: 0,
						channelTitle: "",
						localFolder: "",
						lastSyncedAt: null,
						enabled: true,
						attachmentStorageOverride: null,
						customAttachmentFolderOverride: "",
						lastAttachmentBase: null,
					});
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		for (let i = 0; i < this.plugin.settings.channelMappings.length; i++) {
			this.renderMapping(containerEl, i);
		}

		containerEl.createEl("h2", { text: "Attachment migration" });
		new Setting(containerEl)
			.setName("Preview migration")
			.setDesc("Dry-run preview with diffs")
			.addButton((btn) =>
				btn.setButtonText("Preview").onClick(async () => {
					await this.plugin.checkForMigrationPrompt(true);
				}),
			);
		new Setting(containerEl)
			.setName("Run migration")
			.setDesc("Move attachments and update embeds")
			.addButton((btn) =>
				btn.setButtonText("Run").setCta().onClick(async () => {
					await this.plugin.runMigration();
				}),
			);
	}

	private renderMapping(containerEl: HTMLElement, index: number): void {
		const mapping = this.plugin.settings.channelMappings[index];
		const wrapper = containerEl.createDiv({ cls: "arena-sync-mapping" });

		new Setting(wrapper)
			.setName(`Mapping #${index + 1}`)
			.setDesc(
				mapping.lastSyncedAt
					? `Last imported ${new Date(mapping.lastSyncedAt).toLocaleString()}`
					: "Never imported",
			)
			.addText((text) =>
				text
					.setPlaceholder("channel-slug")
					.setValue(mapping.channelSlug)
					.onChange(async (v) => {
						const trimmed = v.trim();
						if (!trimmed) {
							new Notice("Channel slug cannot be empty");
							return;
						}
						mapping.channelSlug = trimmed;
						await this.plugin.saveSettings();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder("Vault/Folder")
					.setValue(mapping.localFolder)
					.onChange(async (v) => {
						const trimmed = v.trim();
						if (!trimmed) {
							new Notice("Local folder path cannot be empty");
							return;
						}
						mapping.localFolder = trimmed;
						await this.plugin.saveSettings();
					}),
			)
			.addToggle((toggle) =>
				toggle.setValue(mapping.enabled).onChange(async (v) => {
					mapping.enabled = v;
					await this.plugin.saveSettings();
				}),
			)
			.addButton((btn) =>
				btn
					.setButtonText("Remove")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.channelMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(wrapper)
			.setName("Attachment storage override")
			.setDesc("Override attachment location for this channel")
			.addDropdown((dd) =>
				dd
					.addOptions({
						inherit: "Inherit global setting",
						channel: "With channel notes",
						global: "Global folder",
						custom: "Custom folder",
					})
					.setValue(mapping.attachmentStorageOverride ?? "inherit")
					.onChange(async (value) => {
						mapping.attachmentStorageOverride =
							value === "inherit"
								? null
								: (value as AttachmentStorage);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (mapping.attachmentStorageOverride === "custom") {
			new Setting(wrapper)
				.setName("Channel custom attachment folder")
				.setDesc("Overrides the global custom folder for this channel")
				.addText((text) =>
					text
						.setPlaceholder("Path/In/Vault")
						.setValue(mapping.customAttachmentFolderOverride || "")
						.onChange(async (v) => {
							mapping.customAttachmentFolderOverride = v.trim();
							await this.plugin.saveSettings();
						}),
				);
		}
	}
}
