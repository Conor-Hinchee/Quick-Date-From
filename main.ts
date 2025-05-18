import { Plugin, Editor, MarkdownView, Notice } from 'obsidian';

export default class QuickDateFrom extends Plugin {
    onload() {
        console.log('QuickDateFrom plugin loaded');

        this.addCommand({
            id: 'add-day-number-to-sprouted',
            name: 'Add Day Number to Sprouted Date',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                let changesMade = false;

                const sproutedRegex = /(Sprouted: (\d{1,2}\/\d{1,2}\/\d{2}))(?! Day#\d+)/g;
                let match;

                const currentDate = new Date(2025, 4, 18);

                let lastIndex = 0;
                const parts = [];

                while ((match = sproutedRegex.exec(content)) !== null) {
                    const fullMatch = match[0];
                    const dateString = match[2];

                    const dateParts = dateString.split('/');
                    if (dateParts.length !== 3 || dateParts[2].length !== 2) {
                        new Notice(`Skipping non-M/D/YY date format: ${dateString} in "${fullMatch}"`);
                        continue;
                    }

                    const month = parseInt(dateParts[0], 10) - 1;
                    const day = parseInt(dateParts[1], 10);
                    const year = parseInt(dateParts[2], 10) + 2000;

                    const sproutedDate = new Date(year, month, day);

                    if (isNaN(sproutedDate.getTime()) || 
                        sproutedDate.getFullYear() !== year ||
                        sproutedDate.getMonth() !== month ||
                        sproutedDate.getDate() !== day) {
                        new Notice(`Invalid or ambiguous date encountered: ${dateString} in "${fullMatch}"`);
                        continue; 
                    }

                    const utcCurrent = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                    const utcSprouted = Date.UTC(sproutedDate.getFullYear(), sproutedDate.getMonth(), sproutedDate.getDate());

                    const diffTime = Math.abs(utcCurrent - utcSprouted);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    const replacementString = `${fullMatch} Day#${diffDays}`;
                    
                    parts.push(content.substring(lastIndex, match.index));
                    parts.push(replacementString);
                    lastIndex = match.index + fullMatch.length;
                    changesMade = true;
                }
                
                parts.push(content.substring(lastIndex));
                const newContent = parts.join('');

                if (changesMade) {
                    if (newContent !== content) { 
                        editor.setValue(newContent);
                        new Notice('Sprouted dates updated with day numbers.');
                    } else {
                        new Notice('No effective changes to Sprouted dates, though matches were found.');
                    }
                } else {
                    new Notice('No "Sprouted: {date}" found or all are already updated.');
                }
            }
        });
    }

    onunload() {
        console.log('QuickDateFrom plugin unloaded');
    }
}
