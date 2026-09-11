class ReviewCycle {
    #id;
    #subject;
    #activities;
    #stage;
    #status;
    #inferredBaseDate;
    #milestones;
    #recalculationSuggested;
    #tasks;

    /**
     * @param {Object} params
     * @param {string} params.id
     * @param {string} params.subject
     * @param {string[]} params.activities
     * @param {string} params.stage - 'STAGE_1_INITIAL' | 'STAGE_2_WEEKLY' | 'STAGE_3_MONTHLY' | 'SPLIT_ANOMALOUS'
     * @param {string} params.status - 'CONSISTENT' | 'INCONSISTENT_FLOW' | 'ANOMALOUS_GAP'
     * @param {Date|null} params.inferredBaseDate
     * @param {Array<Object>} params.milestones
     * @param {boolean} [params.recalculationSuggested=false]
     * @param {Array<Object>} [params.tasks=[]]
     */
    constructor({
        id,
        subject,
        activities,
        stage,
        status,
        inferredBaseDate,
        milestones,
        recalculationSuggested = false,
        tasks = []
    }) {
        this.#id = id;
        this.#subject = subject;
        this.#activities = activities || [];
        this.#stage = stage;
        this.#status = status;
        this.#inferredBaseDate = inferredBaseDate;
        this.#milestones = milestones || [];
        this.#recalculationSuggested = recalculationSuggested;
        this.#tasks = tasks;
    }

    getId = () => this.#id;
    getSubject = () => this.#subject;
    getActivities = () => this.#activities;
    getStage = () => this.#stage;
    getStatus = () => this.#status;
    getInferredBaseDate = () => this.#inferredBaseDate;
    getMilestones = () => this.#milestones;
    isRecalculationSuggested = () => this.#recalculationSuggested;
    getTasks = () => this.#tasks;

    getNextPendingReview() {
        const pendingMilestone = this.#milestones.find(m => m.status === 'pending');
        return pendingMilestone ? (pendingMilestone.date instanceof Date ? pendingMilestone.date.toISOString().split('T')[0] : pendingMilestone.date) : null;
    }

    toJSON() {
        return {
            id: this.#id,
            subject: this.#subject,
            activities: this.#activities,
            stage: this.#stage,
            status: this.#status,
            inferredBaseDate: this.#inferredBaseDate ? this.#inferredBaseDate.toISOString().split('T')[0] : null,
            nextPendingReview: this.getNextPendingReview(),
            recalculationSuggested: this.#recalculationSuggested,
            milestones: this.#milestones.map(m => ({
                offsetDays: m.offsetDays,
                label: m.label,
                date: m.date instanceof Date ? m.date.toISOString().split('T')[0] : m.date,
                status: m.status,
                isInferred: m.isInferred || false,
                isCompleted: m.status === 'completed' || m.status === 'completed_inferred'
            })),
            taskCount: this.#tasks.length
        };
    }
}

module.exports = ReviewCycle;

