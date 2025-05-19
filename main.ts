import { Plugin, Editor, MarkdownView, Notice } from 'obsidian';

export default class QuickDateFrom extends Plugin {
    onload() {
        console.log('QuickDateFrom plugin loaded');

        this.addCommand({
            id: 'Plant Stats: Refresh',
            name: 'Refresh Plant Stats Section', // Updated name
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const originalContent = editor.getValue();
                
                const currentDate = new Date(); // Use the actual current date

                const plantStatsEntries = [];
                // Regex to find lines containing "Sprouted: M/D/YY"
                // Group 1: The entire matched line
                // Group 2: The date part "M/D/YY"
                const sproutedRegex = /^(.*Sprouted: (\d{1,2}\/\d{1,2}\/\d{2}).*)$/gm;
                
                let match;
                // Iterate over a stable copy of the content for regex.exec
                const contentForRegex = originalContent; 
                while ((match = sproutedRegex.exec(contentForRegex)) !== null) {
                    const fullLineText = match[1].trim(); // The line containing "Sprouted: date"
                    const dateString = match[2]; // The "M/D/YY" part

                    const dateParts = dateString.split('/');
                    if (dateParts.length !== 3 || dateParts[2].length !== 2) {
                        new Notice(`Skipping non-M/D/YY date format: ${dateString} in "${fullLineText}"`);
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
                        new Notice(`Invalid or ambiguous date encountered: ${dateString} in "${fullLineText}"`);
                        continue; 
                    }

                    const utcCurrent = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                    const utcSprouted = Date.UTC(sproutedDate.getFullYear(), sproutedDate.getMonth(), sproutedDate.getDate());
                    
                    const diffTime = Math.abs(utcCurrent - utcSprouted); // Calculate absolute difference in time
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    plantStatsEntries.push({ lineText: fullLineText, days: diffDays, sproutedDateObject: sproutedDate });
                }
                
                if (plantStatsEntries.length === 0) {
                    new Notice('No "Sprouted: {date}" entries found to generate stats.');
                    return;
                }

                // Sort entries for consistent order
                plantStatsEntries.sort((a, b) => a.lineText.localeCompare(b.lineText));

                const now = new Date();
                const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                // Determine the maximum sprouted days
                const maxSproutedDays = plantStatsEntries.length > 0 ? Math.max(...plantStatsEntries.map(entry => entry.days)) : 0;

                // Calculate plant's age in weeks. Day 0-6 = Week 1, Day 7-13 = Week 2, etc.
                // This applies if maxSproutedDays is 0 (no plants or sprouted today).
                const plantAgeInWeeks = Math.floor(maxSproutedDays / 7) + 1;

                // Calculate current calendar week's start and end dates (based on 'now')
                const currentDayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
                const firstDayOfCurrentWeek = new Date(now);
                firstDayOfCurrentWeek.setDate(now.getDate() - currentDayOfWeek); // Set to Sunday of the current week

                const lastDayOfCurrentWeek = new Date(firstDayOfCurrentWeek);
                lastDayOfCurrentWeek.setDate(firstDayOfCurrentWeek.getDate() + 6); // Set to Saturday of the current week
                
                const formatDate = (date: Date) => {
                    return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
                };

                const dayAndWeekInfoString = `Day ${maxSproutedDays} Week: #${plantAgeInWeeks} (${formatDate(firstDayOfCurrentWeek)} - ${formatDate(lastDayOfCurrentWeek)})`;

                // Construct the new stats block content
                const statsHeader = "## Plant Stats";
                const updatedTimestampLine = `<sub>Last updated: ${timestamp}</sub>`;
                
                let newStatsBlockContent = `${statsHeader}\n${updatedTimestampLine}\n${dayAndWeekInfoString}`;
                
                // If there were no plant entries, the Day X part might be misleading (Day 0).
                // However, the prompt implies this line is always present.
                // If plantStatsEntries is empty, maxSproutedDays will be 0.

                const finalNewStatsBlock = newStatsBlockContent; 
                const newBlockLinesArray = finalNewStatsBlock.split('\n'); // Used for both creating and updating

                const lines = originalContent.replace(/\r\n/g, '\n').split('\n');
                let newFileContentLines; 

                let statsSectionStartLine = -1;
                // This loop only finds the start of the section
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith("## Plant Stats")) {
                        statsSectionStartLine = i;
                        break;
                    }
                }

                let message = '';
                let performedChange = false;

                if (statsSectionStartLine !== -1) { // Existing section found
                    // Determine the precise extent of the old block to compare and replace
                    let oldBlockEndLine = statsSectionStartLine + 1; // Line index after the header line
                    let linesCountedInOldBlock = 1; // Starts with 1 for the header line itself

                    // Iterate for the expected number of lines in the block (newBlockLinesArray.length),
                    // or until EOF / next heading is encountered.
                    while(oldBlockEndLine < lines.length && 
                          !lines[oldBlockEndLine].startsWith("## ") && 
                          linesCountedInOldBlock < newBlockLinesArray.length) {
                        oldBlockEndLine++;
                        linesCountedInOldBlock++;
                    }
                    // oldBlockEndLine is now the line index *after* the last line of the identified old block.
                    
                    const oldBlockActualLines = lines.slice(statsSectionStartLine, oldBlockEndLine);
                    const oldBlockActualText = oldBlockActualLines.join('\n'); 
                    
                    // Compare with finalNewStatsBlock (which is already clean, no trailing newline)
                    if (oldBlockActualText === finalNewStatsBlock) { 
                        new Notice('Plant stats are already up to date.');
                        return;
                    }
                    
                    newFileContentLines = [...lines]; 
                    // Replace exactly the identified old block lines with the new block lines
                    newFileContentLines.splice(statsSectionStartLine, oldBlockActualLines.length, ...newBlockLinesArray); 
                    message = 'Plant stats section updated.';
                    performedChange = true;
                } else { // No existing section, prepend it
                    newFileContentLines = [...newBlockLinesArray, '', ...lines]; 
                    message = 'Plant stats section created.';
                    performedChange = true;
                }

                if (performedChange) {
                    let newFileContent = newFileContentLines.join('\n');
                    
                    // Normalize trailing newline for the new content
                    if (newFileContent.length > 0 && !newFileContent.endsWith('\n')) {
                        newFileContent += '\n';
                    }
                    newFileContent = newFileContent.replace(/\s*\n$/, '\n'); // Ensure single trailing newline, remove blank lines at end


                    // Normalize original content for comparison
                    let normalizedOriginalContent = originalContent.replace(/\r\n/g, '\n');
                    if (normalizedOriginalContent.length > 0 && !normalizedOriginalContent.endsWith('\n')) {
                        normalizedOriginalContent += '\n';
                    }
                    normalizedOriginalContent = normalizedOriginalContent.replace(/\s*\n$/, '\n');

                    if (newFileContent !== normalizedOriginalContent) {
                        editor.setValue(newFileContent);
                        new Notice(message);
                    } else {
                        new Notice('Plant stats are up to date (no effective changes to the file).');
                    }
                }
            }
        });
    }

    onunload() {
        console.log('QuickDateFrom plugin unloaded');
    }
}
