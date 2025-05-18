import { Plugin, MarkdownView } from 'obsidian';

export default class QuickTimestamper extends Plugin {
    onload() {
        this.registerMarkdownCodeBlockProcessor("quick-timestamp-button", (source, el, ctx) => {
            const container = el.createEl("div");
            const button = container.createEl("button", { text: "🪵 Time" });

            button.addEventListener("click", async () => {
                console.log("DEBUG ENABLED: QuickTimestamper clicked");
                try {
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const seconds = String(now.getSeconds()).padStart(2, '0');
    
                    const timestamp = `🪵 Logged at: ${hours}:${minutes}:${seconds}`;
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    const sectionInfo = ctx.getSectionInfo(el);
                    if (!view || !view.editor || !view.file) {
                        throw new Error("Markdown view or editor not found.");
                    }

                    if (!sectionInfo) {
                        throw new Error("Section info not found.");
                    }

                    // Get the line number of the code block
                    const lineNumber = sectionInfo.lineStart;
                    const position = { line: lineNumber + 2, ch: 0 };
                    view.editor.replaceRange(timestamp + '\n', position);
                    
                    // Save the file
                    await this.app.vault.modify(view.file, view.editor.getValue());

                } catch (error) {
                    console.error("Error in QuickTimestamper:", error);
                }
            });
        });
    }
}
