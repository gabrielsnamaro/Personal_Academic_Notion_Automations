const crypto = require('crypto');
const ReviewCycle = require('../ReviewCycle');

class ReviewCycleClassifier {
    /**
     * Ponto de entrada para classificar uma lista de ReviewTasks em ciclos de estudo.
     * @param {Array<Object>} reviewTasks - Lista de instâncias de ReviewTask
     * @returns {ReviewCycle[]}
     */
    static classify(reviewTasks) {
        if (!reviewTasks || reviewTasks.length === 0) {
            return [];
        }

        const groups = this._groupTasksBySubjectAndActivities(reviewTasks);
        const classifiedCycles = [];

        for (const group of groups) {
            const cycles = this._classifyGroup(group.subject, group.activities, group.tasks);
            classifiedCycles.push(...cycles);
        }

        // Ordenar ciclos pela data da próxima revisão pendente (a mais próxima primeiro)
        classifiedCycles.sort((a, b) => {
            const dateA = a.getNextPendingReview();
            const dateB = b.getNextPendingReview();
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA.localeCompare(dateB);
        });

        return classifiedCycles;
    }

    /**
     * Agrupa as tarefas por matéria e lista ordenada de tópicos normalizados.
     */
    static _groupTasksBySubjectAndActivities(tasks) {
        const groupsMap = new Map();

        for (const task of tasks) {
            let subject = '';
            if (typeof task.getSubject === 'function') {
                subject = task.getSubject();
            } else if (typeof task.getSubject === 'string') {
                subject = task.getSubject;
            } else if (task.subject) {
                subject = task.subject;
            }
            subject = subject.trim();

            let rawActivities = [];
            if (typeof task.getActivities === 'function') {
                rawActivities = task.getActivities();
            } else if (Array.isArray(task.getActivities)) {
                rawActivities = task.getActivities;
            } else if (Array.isArray(task.activities)) {
                rawActivities = task.activities;
            }
            const normalizedActivities = rawActivities.map(a => String(a).trim()).filter(Boolean);

            // Chave canônica: matéria em minúsculas + tópicos em minúsculas e ordenados
            const sortedKeyActivities = [...normalizedActivities].map(a => a.toLowerCase()).sort();
            const key = `${subject.toLowerCase()}|||${sortedKeyActivities.join(';')}`;

            if (!groupsMap.has(key)) {
                groupsMap.set(key, {
                    subject,
                    activities: normalizedActivities,
                    tasks: []
                });
            }

            groupsMap.get(key).tasks.push(task);
        }

        return Array.from(groupsMap.values());
    }

    /**
     * Analisa as datas das tarefas de um mesmo tópico e aplica a dedução matemática.
     */
    static _classifyGroup(subject, activities, tasks) {
        // Mapear tarefas por data única (normalizada YYYY-MM-DD)
        const dateMap = new Map();

        for (const task of tasks) {
            const rawDate = typeof task.getScheduledDate === 'function' 
                ? task.getScheduledDate() 
                : (task.date instanceof Date ? task.date : new Date(task.date));

            if (!rawDate || isNaN(rawDate.getTime())) continue;

            const dateStr = this._toDateString(rawDate);
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: rawDate,
                    dateStr,
                    tasks: []
                });
            }
            dateMap.get(dateStr).tasks.push(task);
        }

        const distinctDateEntries = Array.from(dateMap.values())
            .sort((a, b) => a.date - b.date);

        const n = distinctDateEntries.length;

        if (n === 0) return [];

        // Caso 1: Apenas 1 data encontrada -> Deduz-se que é a revisão mensal (30 dias)
        if (n === 1) {
            return [this._buildSingleMonthlyCycle(subject, activities, distinctDateEntries[0])];
        }

        // Caso 2: Exatamente 2 datas encontradas
        if (n === 2) {
            const [entryA, entryB] = distinctDateEntries;
            const diffDays = this._getDaysDiff(entryA.date, entryB.date);

            // Cenário 2.1: Espaçamento de 23 dias (Fluxo correspondente a 7 dias e 30 dias)
            if (diffDays === 23) {
                return [this._buildWeeklyAndMonthlyCycle(subject, activities, entryA, entryB)];
            }

            // Cenário 2.2: Não segue o fluxo esperado de término (ex: Δ = 6 dias, onde falta a mensal, ou outro Δ arbitrário)
            // Regra explícita: Devem ser tratadas como revisões DIFERENTES e recalculadas.
            return [
                this._buildSplitAnomalousCycle(subject, activities, entryA, 'INCONSISTENT_FLOW', 'Faltando revisão mensal de 30 dias ou espaçamento proporcional rompido.'),
                this._buildSplitAnomalousCycle(subject, activities, entryB, 'INCONSISTENT_FLOW', 'Faltando revisão mensal de 30 dias ou espaçamento proporcional rompido.')
            ];
        }

        // Caso 3: Exatamente 3 datas encontradas
        if (n === 3) {
            const [entryA, entryB, entryC] = distinctDateEntries;
            const diff1 = this._getDaysDiff(entryA.date, entryB.date);
            const diff2 = this._getDaysDiff(entryB.date, entryC.date);

            if (diff1 === 6 && diff2 === 23) {
                // Ciclo inicial completo intacto (1d, 7d, 30d)
                return [this._buildFullInitialCycle(subject, activities, entryA, entryB, entryC)];
            }
        }

        // Caso Geral (n > 3 ou combinações mistas): Algoritmo de correspondência gulosa
        return this._greedyMultiMatch(subject, activities, distinctDateEntries);
    }

    /**
     * Constrói ciclo no estágio 3 (Mensal) para revisão única restante.
     */
    static _buildSingleMonthlyCycle(subject, activities, entry) {
        const d30 = entry.date;
        const d0 = this._addDays(d30, -30);
        const d1 = this._addDays(d0, 1);
        const d7 = this._addDays(d0, 7);

        const id = this._generateId(subject, activities, d0, 'monthly');

        return new ReviewCycle({
            id,
            subject,
            activities,
            stage: 'STAGE_3_MONTHLY',
            status: 'CONSISTENT',
            inferredBaseDate: d0,
            milestones: [
                { offsetDays: 1, label: '1 dia', date: d1, status: 'completed_inferred', isInferred: true },
                { offsetDays: 7, label: '7 dias', date: d7, status: 'completed_inferred', isInferred: true },
                { offsetDays: 30, label: '30 dias', date: d30, status: 'pending', isInferred: false }
            ],
            recalculationSuggested: false,
            tasks: entry.tasks
        });
    }

    /**
     * Constrói ciclo no estágio 2 (Semanal) para par com Δ = 23 dias (7d e 30d).
     */
    static _buildWeeklyAndMonthlyCycle(subject, activities, entry7, entry30) {
        const d7 = entry7.date;
        const d30 = entry30.date;
        const d0 = this._addDays(d7, -7);
        const d1 = this._addDays(d0, 1);

        const id = this._generateId(subject, activities, d0, 'weekly');

        return new ReviewCycle({
            id,
            subject,
            activities,
            stage: 'STAGE_2_WEEKLY',
            status: 'CONSISTENT',
            inferredBaseDate: d0,
            milestones: [
                { offsetDays: 1, label: '1 dia', date: d1, status: 'completed_inferred', isInferred: true },
                { offsetDays: 7, label: '7 dias', date: d7, status: 'pending', isInferred: false },
                { offsetDays: 30, label: '30 dias', date: d30, status: 'pending', isInferred: false }
            ],
            recalculationSuggested: false,
            tasks: [...entry7.tasks, ...entry30.tasks]
        });
    }

    /**
     * Constrói ciclo no estágio 1 (Inicial) para trinca intacta (1d, 7d, 30d).
     */
    static _buildFullInitialCycle(subject, activities, entry1, entry7, entry30) {
        const d1 = entry1.date;
        const d7 = entry7.date;
        const d30 = entry30.date;
        const d0 = this._addDays(d1, -1);

        const id = this._generateId(subject, activities, d0, 'initial');

        return new ReviewCycle({
            id,
            subject,
            activities,
            stage: 'STAGE_1_INITIAL',
            status: 'CONSISTENT',
            inferredBaseDate: d0,
            milestones: [
                { offsetDays: 1, label: '1 dia', date: d1, status: 'pending', isInferred: false },
                { offsetDays: 7, label: '7 dias', date: d7, status: 'pending', isInferred: false },
                { offsetDays: 30, label: '30 dias', date: d30, status: 'pending', isInferred: false }
            ],
            recalculationSuggested: false,
            tasks: [...entry1.tasks, ...entry7.tasks, ...entry30.tasks]
        });
    }

    /**
     * Constrói ciclo divergente/desmembrado que requer recálculo.
     */
    static _buildSplitAnomalousCycle(subject, activities, entry, status, reason) {
        const id = this._generateId(subject, activities, entry.date, 'split');

        return new ReviewCycle({
            id,
            subject,
            activities,
            stage: 'SPLIT_ANOMALOUS',
            status,
            inferredBaseDate: null,
            milestones: [
                { offsetDays: 0, label: 'Revisão Desmembrada', date: entry.date, status: 'pending', isInferred: false, reason }
            ],
            recalculationSuggested: true,
            tasks: entry.tasks
        });
    }

    /**
     * Correspondência gulosa para grupos com mais de 3 datas ou deltas mistos.
     */
    static _greedyMultiMatch(subject, activities, entries) {
        const matchedIndices = new Set();
        const cycles = [];

        // Passo 1: Procurar trincas (6 dias e 23 dias)
        for (let i = 0; i < entries.length; i++) {
            if (matchedIndices.has(i)) continue;
            for (let j = i + 1; j < entries.length; j++) {
                if (matchedIndices.has(j)) continue;
                if (this._getDaysDiff(entries[i].date, entries[j].date) === 6) {
                    for (let k = j + 1; k < entries.length; k++) {
                        if (matchedIndices.has(k)) continue;
                        if (this._getDaysDiff(entries[j].date, entries[k].date) === 23) {
                            cycles.push(this._buildFullInitialCycle(subject, activities, entries[i], entries[j], entries[k]));
                            matchedIndices.add(i);
                            matchedIndices.add(j);
                            matchedIndices.add(k);
                            break;
                        }
                    }
                }
                if (matchedIndices.has(i)) break;
            }
        }

        // Passo 2: Procurar duplas de 23 dias (7d e 30d)
        for (let i = 0; i < entries.length; i++) {
            if (matchedIndices.has(i)) continue;
            for (let j = i + 1; j < entries.length; j++) {
                if (matchedIndices.has(j)) continue;
                if (this._getDaysDiff(entries[i].date, entries[j].date) === 23) {
                    cycles.push(this._buildWeeklyAndMonthlyCycle(subject, activities, entries[i], entries[j]));
                    matchedIndices.add(i);
                    matchedIndices.add(j);
                    break;
                }
            }
        }

        // Passo 3: Analisar os restantes
        const unmatched = entries.filter((_, idx) => !matchedIndices.has(idx));

        if (unmatched.length === 1) {
            cycles.push(this._buildSingleMonthlyCycle(subject, activities, unmatched[0]));
        } else {
            for (const item of unmatched) {
                cycles.push(this._buildSplitAnomalousCycle(subject, activities, item, 'INCONSISTENT_FLOW', 'Revisão isolada fora do fluxo regular de término.'));
            }
        }

        return cycles;
    }

    /**
     * Calcula a diferença estrita em dias civis entre duas datas.
     */
    static _getDaysDiff(dateA, dateB) {
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
        const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
        return Math.round((utcB - utcA) / ONE_DAY_MS);
    }

    /**
     * Adiciona (ou subtrai) dias de uma data com segurança UTC.
     */
    static _addDays(date, days) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0));
    }

    static _toDateString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    static _generateId(subject, activities, baseDate, prefix = 'rev') {
        const raw = `${subject}:${activities.join(',')}:${baseDate ? baseDate.getTime() : Math.random()}`;
        const hash = crypto.createHash('md5').update(raw).digest('hex').slice(0, 10);
        return `${prefix}-${hash}`;
    }
}

module.exports = ReviewCycleClassifier;

