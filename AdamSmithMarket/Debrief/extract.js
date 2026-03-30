const fs = require('fs');
try {
    const content = fs.readFileSync('tmp_xlsx/xl/sharedStrings.xml', 'utf8');
    const tTags = content.split('<t>').map(s => s.split('</t>')[0]);
    const students = [];
    for (let i = 0; i < tTags.length; i++) {
        if (tTags[i].startsWith('[{"term":')) {
            const responsesStr = tTags[i].replace(/&quot;/g, '"');
            try {
                const responses = JSON.parse(responsesStr);
                const name = tTags[i-1] ? tTags[i-1].trim() : "Unknown";
                const pin = tTags[i-2] ? tTags[i-2].trim() : "Unknown";
                if (name && name.length < 50 && !name.includes('[') && !name.includes('<')) {
                    students.push({ name, pin, responses: responses });
                }
            } catch(e) {}
        }
    }
    console.log(JSON.stringify(students, null, 2));
} catch (e) {
    console.error(e);
}
