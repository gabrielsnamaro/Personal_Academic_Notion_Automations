const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ReviewCycleClassifier = require('../src/domain/notion/classifiers/ReviewCycleClassifier');
const Block = require('../src/domain/notion/Block');
const Page = require('../src/domain/notion/Page');
const ElementBuilder = require('../src/domain/notion/parsers/ElementBuilder');
const ReviewTask = require('../src/domain/notion/ReviewTask');

test('ReviewCycleClassifier - Caso 1: Apenas 1 revisão (dedução mensal de 30 dias)', () => {
    const mockTasks = [
        {
            getSubject: () => 'Sistemas Operacionais',
            getActivities: () => ['Threads e Processos'],
            getScheduledDate: () => new Date(2026, 9, 8, 12, 0, 0), // 2026-10-08
            isCompleted: () => false
        }
    ];

    const cycles = ReviewCycleClassifier.classify(mockTasks);

    assert.strictEqual(cycles.length, 1);
    const cycle = cycles[0];

    assert.strictEqual(cycle.getSubject(), 'Sistemas Operacionais');
    assert.strictEqual(cycle.getStage(), 'STAGE_3_MONTHLY');
    assert.strictEqual(cycle.getStatus(), 'CONSISTENT');
    assert.strictEqual(cycle.isRecalculationSuggested(), false);

    const json = cycle.toJSON();
    assert.strictEqual(json.inferredBaseDate, '2026-09-08');
    assert.strictEqual(json.nextPendingReview, '2026-10-08');
    assert.strictEqual(json.milestones.length, 3);

    // Marcos de 1d e 7d deduzidos como concluídos
    assert.strictEqual(json.milestones[0].offsetDays, 1);
    assert.strictEqual(json.milestones[0].status, 'completed_inferred');
    assert.strictEqual(json.milestones[0].date, '2026-09-09');

    assert.strictEqual(json.milestones[1].offsetDays, 7);
    assert.strictEqual(json.milestones[1].status, 'completed_inferred');
    assert.strictEqual(json.milestones[1].date, '2026-09-15');

    // Marco de 30d pendente
    assert.strictEqual(json.milestones[2].offsetDays, 30);
    assert.strictEqual(json.milestones[2].status, 'pending');
    assert.strictEqual(json.milestones[2].date, '2026-10-08');
});

test('ReviewCycleClassifier - Caso 2A: 2 revisões com Δ = 23 dias (7d e 30d no mesmo fluxo)', () => {
    const mockTasks = [
        {
            getSubject: () => 'Redes de Computadores',
            getActivities: () => ['Modelo Cliente-Servidor'],
            getScheduledDate: () => new Date(2026, 8, 15, 12, 0, 0), // 2026-09-15
            isCompleted: () => false
        },
        {
            getSubject: () => 'Redes de Computadores',
            getActivities: () => ['Modelo Cliente-Servidor'],
            getScheduledDate: () => new Date(2026, 9, 8, 12, 0, 0), // 2026-10-08
            isCompleted: () => false
        }
    ];

    const cycles = ReviewCycleClassifier.classify(mockTasks);

    assert.strictEqual(cycles.length, 1);
    const cycle = cycles[0];

    assert.strictEqual(cycle.getSubject(), 'Redes de Computadores');
    assert.strictEqual(cycle.getStage(), 'STAGE_2_WEEKLY');
    assert.strictEqual(cycle.getStatus(), 'CONSISTENT');
    assert.strictEqual(cycle.isRecalculationSuggested(), false);

    const json = cycle.toJSON();
    assert.strictEqual(json.inferredBaseDate, '2026-09-08');
    assert.strictEqual(json.nextPendingReview, '2026-09-15');

    // 1d deduzida concluída
    assert.strictEqual(json.milestones[0].offsetDays, 1);
    assert.strictEqual(json.milestones[0].status, 'completed_inferred');
    assert.strictEqual(json.milestones[0].date, '2026-09-09');

    // 7d e 30d pendentes
    assert.strictEqual(json.milestones[1].offsetDays, 7);
    assert.strictEqual(json.milestones[1].status, 'pending');
    assert.strictEqual(json.milestones[1].date, '2026-09-15');

    assert.strictEqual(json.milestones[2].offsetDays, 30);
    assert.strictEqual(json.milestones[2].status, 'pending');
    assert.strictEqual(json.milestones[2].date, '2026-10-08');
});

test('ReviewCycleClassifier - Caso 2B: 2 revisões com Δ = 6 dias (1d e 7d faltando a de 30d) -> Devem ser tratadas como DIFERENTES e recalculadas', () => {
    const mockTasks = [
        {
            getSubject: () => 'Banco de Dados',
            getActivities: () => ['Álgebra Relacional'],
            getScheduledDate: () => new Date(2026, 8, 9, 12, 0, 0), // 2026-09-09
            isCompleted: () => false
        },
        {
            getSubject: () => 'Banco de Dados',
            getActivities: () => ['Álgebra Relacional'],
            getScheduledDate: () => new Date(2026, 8, 15, 12, 0, 0), // 2026-09-15
            isCompleted: () => false
        }
    ];

    const cycles = ReviewCycleClassifier.classify(mockTasks);

    // Como falta a revisão mensal, não segue o fluxo e deve ser desmembrada em 2 revisões diferentes
    assert.strictEqual(cycles.length, 2);

    for (const c of cycles) {
        assert.strictEqual(c.getSubject(), 'Banco de Dados');
        assert.strictEqual(c.getStage(), 'SPLIT_ANOMALOUS');
        assert.strictEqual(c.getStatus(), 'INCONSISTENT_FLOW');
        assert.strictEqual(c.isRecalculationSuggested(), true);
    }
});

test('ReviewCycleClassifier - Caso 3: 3 revisões intactas (1d, 7d e 30d com Δ1 = 6 e Δ2 = 23)', () => {
    const mockTasks = [
        {
            getSubject: () => 'Compiladores',
            getActivities: () => ['Análise Sintática'],
            getScheduledDate: () => new Date(2026, 8, 9, 12, 0, 0), // 2026-09-09
            isCompleted: () => false
        },
        {
            getSubject: () => 'Compiladores',
            getActivities: () => ['Análise Sintática'],
            getScheduledDate: () => new Date(2026, 8, 15, 12, 0, 0), // 2026-09-15
            isCompleted: () => false
        },
        {
            getSubject: () => 'Compiladores',
            getActivities: () => ['Análise Sintática'],
            getScheduledDate: () => new Date(2026, 9, 8, 12, 0, 0), // 2026-10-08
            isCompleted: () => false
        }
    ];

    const cycles = ReviewCycleClassifier.classify(mockTasks);

    assert.strictEqual(cycles.length, 1);
    const cycle = cycles[0];

    assert.strictEqual(cycle.getSubject(), 'Compiladores');
    assert.strictEqual(cycle.getStage(), 'STAGE_1_INITIAL');
    assert.strictEqual(cycle.getStatus(), 'CONSISTENT');
    assert.strictEqual(cycle.isRecalculationSuggested(), false);

    const json = cycle.toJSON();
    assert.strictEqual(json.inferredBaseDate, '2026-09-08');
    assert.strictEqual(json.nextPendingReview, '2026-09-09');

    // Todas as 3 pendentes
    assert.strictEqual(json.milestones[0].status, 'pending');
    assert.strictEqual(json.milestones[1].status, 'pending');
    assert.strictEqual(json.milestones[2].status, 'pending');
});

test('ReviewCycleClassifier - Integração com Payload Real de Produção (138 blocos / 45 tarefas)', () => {
    const prodPayloadPath = path.resolve(__dirname, '../../temp_payloads/prod_revisoes_latest/block_children.json');
    if (!fs.existsSync(prodPayloadPath)) {
        return;
    }

    const children = JSON.parse(fs.readFileSync(prodPayloadPath, 'utf8'));
    const reviewBlocks = children.slice(1);
    const domainBlocks = reviewBlocks.map(b => new Block(b));
    const page = new Page('prod_test', domainBlocks, null);
    page.setElementPointer(0);

    const tasks = [];
    while (!page.endOfPage()) {
        try {
            const el = ElementBuilder.fromPage(page).tryReviewTask().build();
            if (el instanceof ReviewTask) {
                tasks.push(el);
            }
        } catch (e) {
            page.getNextBlock();
        }
    }

    assert.strictEqual(tasks.length, 45);

    const cycles = ReviewCycleClassifier.classify(tasks);
    assert.ok(cycles.length > 0);

    // As 8 matérias de 'Redes de Computadores' têm pares de 2026-09-15 e 2026-10-08 (Δ = 23)
    const redesCycles = cycles.filter(c => c.getSubject() === 'Redes de Computadores');
    assert.strictEqual(redesCycles.length, 8);
    for (const rc of redesCycles) {
        assert.strictEqual(rc.getStage(), 'STAGE_2_WEEKLY');
        assert.strictEqual(rc.getStatus(), 'CONSISTENT');
        assert.strictEqual(rc.isRecalculationSuggested(), false);
    }

    // As matérias isoladas de 'Teoria dos Grafos' têm apenas 1 data -> STAGE_3_MONTHLY
    const grafosCycles = cycles.filter(c => c.getSubject() === 'Teoria dos Grafos e Computabilidade');
    for (const gc of grafosCycles) {
        assert.strictEqual(gc.getStage(), 'STAGE_3_MONTHLY');
        assert.strictEqual(gc.getStatus(), 'CONSISTENT');
        assert.strictEqual(gc.isRecalculationSuggested(), false);
    }
});

test('ReviewService - getActiveReviewCycles retorna estrutura completa de dashboard', async () => {
    const ReviewService = require('../src/services/ReviewService');
    const prodPayloadPath = path.resolve(__dirname, '../../temp_payloads/prod_revisoes_latest/block_children.json');
    if (!fs.existsSync(prodPayloadPath)) return;

    // Simular blocos raiz contendo o callout de produção
    const children = JSON.parse(fs.readFileSync(prodPayloadPath, 'utf8'));
    const mockRawBlocks = [
        {
            id: '3d871fa4-f246-80b9-8ad7-ee444af6bd53',
            type: 'callout',
            has_children: true,
            callout: {
                rich_text: [],
                icon: { type: 'emoji', emoji: '🧠' }
            }
        }
    ];

    // Mockar NotionApiService.getPageBlocks para retornar children
    const NotionApiService = require('../src/services/NotionApiService');
    const originalGetPageBlocks = NotionApiService.getPageBlocks;
    NotionApiService.getPageBlocks = async (blockId) => {
        if (blockId === '3d871fa4-f246-80b9-8ad7-ee444af6bd53') {
            return { results: children };
        }
        return { results: [] };
    };

    try {
        const result = await ReviewService.getActiveReviewCycles(mockRawBlocks);
        
        assert.ok(result.summary);
        assert.ok(result.summary.totalCycles > 0);
        assert.strictEqual(result.summary.stage2Weekly, 8);
        assert.ok(Array.isArray(result.cycles));
        assert.ok(Array.isArray(result.timeline));
        assert.ok(result.timeline.length > 0);

        // A timeline deve estar ordenada cronologicamente
        for (let i = 1; i < result.timeline.length; i++) {
            assert.ok(result.timeline[i].date >= result.timeline[i - 1].date);
        }
    } finally {
        NotionApiService.getPageBlocks = originalGetPageBlocks;
    }
});

test('ReviewService - invalidateCycle realiza Atomic Container Replacement removendo o ciclo alvo', async () => {
    const prodPayloadPath = path.resolve(__dirname, '../../temp_payloads/prod_revisoes_latest/block_children.json');
    if (!fs.existsSync(prodPayloadPath)) {
        return;
    }
    const children = JSON.parse(fs.readFileSync(prodPayloadPath, 'utf8'));

    const mockRawBlocks = [
        {
            id: '3d871fa4-f246-80b9-8ad7-ee444af6bd53',
            type: 'callout',
            has_children: true,
            callout: {
                rich_text: [],
                icon: { type: 'emoji', emoji: '🧠' }
            }
        }
    ];

    const NotionApiService = require('../src/services/NotionApiService');
    const ReviewService = require('../src/services/ReviewService');

    const originalGetPageBlocks = NotionApiService.getPageBlocks;
    const originalAppendBlocks = NotionApiService.appendBlocks;
    const originalDeleteBlock = NotionApiService.deleteBlock;

    let createdCallout = null;
    let appendedChildren = [];
    let deletedBlockId = null;

    NotionApiService.getPageBlocks = async (blockId) => {
        if (blockId === '3d871fa4-f246-80b9-8ad7-ee444af6bd53') {
            return { results: children };
        }
        return { results: [] };
    };

    NotionApiService.appendBlocks = async (parentId, blocks) => {
        if (!createdCallout) {
            // Criação do novo callout
            createdCallout = blocks[0];
            return { results: [{ id: 'new-callout-id' }] };
        } else {
            // Injeção de blocos filhos dentro do callout
            appendedChildren.push(...blocks);
            return { results: blocks.map((b, i) => ({ id: `new-block-${i}` })) };
        }
    };

    NotionApiService.deleteBlock = async (blockId) => {
        deletedBlockId = blockId;
        return { id: blockId };
    };

    try {
        // 1. Obter ciclos atuais para pegar um ID válido
        const initialData = await ReviewService.getActiveReviewCycles(mockRawBlocks);
        assert.ok(initialData.cycles.length > 0);
        const targetCycle = initialData.cycles[0];

        // 2. Executar a invalidação
        const result = await ReviewService.invalidateCycle(targetCycle.id, {}, mockRawBlocks);

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.cycleId, targetCycle.id);
        assert.ok(result.deletedTasksCount > 0);
        assert.strictEqual(deletedBlockId, '3d871fa4-f246-80b9-8ad7-ee444af6bd53');
        assert.ok(createdCallout);
        assert.strictEqual(createdCallout.type, 'callout');
        assert.ok(appendedChildren.length > 0);

        // O cabeçalho deve estar preservado no primeiro bloco dos filhos
        assert.strictEqual(appendedChildren[0].type, 'heading_1');
    } finally {
        NotionApiService.getPageBlocks = originalGetPageBlocks;
        NotionApiService.appendBlocks = originalAppendBlocks;
        NotionApiService.deleteBlock = originalDeleteBlock;
    }
});

