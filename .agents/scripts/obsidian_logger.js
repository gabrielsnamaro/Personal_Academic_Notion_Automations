const fs = require('fs');
const path = require('path');

let inputData = '';

process.stdin.on('data', chunk => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    let outputSent = false;
    const sendOutput = () => {
        if (!outputSent) {
            console.log(JSON.stringify({ decision: "stop" }));
            outputSent = true;
        }
    };

    try {
        const payload = JSON.parse(inputData);
        sendOutput(); // Libera o hook o quanto antes

        if (payload.transcriptPath) {
            const obsidianDir = 'C:\\Users\\gabri\\Documents\\PersonalKnowledge\\Antigravity Sessions';
            if (!fs.existsSync(obsidianDir)) {
                fs.mkdirSync(obsidianDir, { recursive: true });
            }

            // Pega a data local (fuso do sistema) para não virar o dia antes da hora
            const d = new Date();
            const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const shortId = payload.conversationId ? payload.conversationId.split('-')[0] : 'local';
            const logFile = path.join(obsidianDir, `${dateStr}_Session_${shortId}.md`);

            const transcriptLines = fs.readFileSync(payload.transcriptPath, 'utf8')
                .split('\n')
                .filter(l => l.trim())
                .map(l => JSON.parse(l));

            let markdownContent = `---\ntipo: session-log\nconversationId: ${payload.conversationId}\ndata: ${dateStr}\n---\n\n`;
            markdownContent += `# Sessão Antigravity (${dateStr})\n\n`;
            
            markdownContent += `## Histórico de Interações\n\n`;

            for (const step of transcriptLines) {
                if (step.type === 'USER_INPUT') {
                    markdownContent += `### 🗣️ Usuário\n\n${step.content || '(Vazio / Apenas Contexto)'}\n\n`;
                } else if (step.type === 'PLANNER_RESPONSE') {
                    if (step.content) {
                        markdownContent += `### 🤖 Antigravity\n\n${step.content}\n\n`;
                    }
                    if (step.tool_calls && step.tool_calls.length > 0) {
                        markdownContent += `**Ferramentas Utilizadas:**\n`;
                        step.tool_calls.forEach(tc => {
                            markdownContent += `- \`${tc.name}\`: ${tc.arguments ? (tc.arguments.toolSummary || tc.arguments.toolAction || 'Ação em background') : 'Chamada'}\n`;
                        });
                        markdownContent += `\n`;
                    }
                }
            }

            fs.writeFileSync(logFile, markdownContent, 'utf8');
        }
    } catch (e) {
        sendOutput();
    }
});
