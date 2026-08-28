const fs = require('fs');

const data = JSON.parse(fs.readFileSync('page_payload.json', 'utf8'));
const blocks = data.results;

const revHeadingIndex = blocks.findIndex(b => 
    b.type === 'heading_1' && b.heading_1.rich_text.some(rt => rt.plain_text.includes('Revisões marcadas'))
);

const sampleBlocks = blocks.slice(revHeadingIndex, revHeadingIndex + 15);
console.log(JSON.stringify(sampleBlocks, null, 2));
