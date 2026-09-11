const ReviewService = require('../services/ReviewService');

class ReviewController {
    static async scheduleReviews(req, res) {
        try {
            const { subject, activities, batches, formalizationDate } = req.body;
            
            // Suporte retrocompatível para requisição única (caso mande avulso)
            const studyBatches = batches || [{ subject, activities }];
            
            console.log('[ReviewController] 📥 Recebida requisição POST /notion/reviews/schedule:', {
                totalBatches: studyBatches?.length,
                formalizationDate,
                batches: studyBatches
            });

            if (!studyBatches || studyBatches.length === 0 || !formalizationDate) {
                console.warn('[ReviewController] ⚠️ Parâmetros incompletos na requisição.');
                return res.status(400).json({ error: "Parâmetros incompletos. Forneça os blocos de estudo e a data de formalização." });
            }

            const result = await ReviewService.scheduleReviews(studyBatches, formalizationDate);
            console.log('[ReviewController] 📤 Agendamento processado com sucesso:', result);
            return res.json(result);
        } catch (error) {
            console.error("[ReviewController] ❌ Erro no agendamento:", error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    static async getScheduledReviews(req, res) {
        try {
            console.log('[ReviewController] 📥 Recebida requisição GET /notion/reviews');
            const reviews = await ReviewService.getScheduledReviews();
            console.log(`[ReviewController] 📤 Retornando ${reviews.length} revisões agendadas com sucesso.`);
            return res.json({ reviews });
        } catch (error) {
            console.error("[ReviewController] ❌ Erro ao buscar revisões agendadas:", error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    static async getActiveReviewCycles(req, res) {
        try {
            console.log('[ReviewController] 📥 Recebida requisição GET /notion/reviews/active');
            const data = await ReviewService.getActiveReviewCycles();
            console.log(`[ReviewController] 📤 Retornando ${data.cycles.length} ciclos de revisão classificados (${data.summary.totalCycles} ciclos, ${data.timeline.length} pendentes).`);
            return res.json({ success: true, ...data });
        } catch (error) {
            console.error("[ReviewController] ❌ Erro ao buscar ciclos de revisão ativos:", error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    static async invalidateCycle(req, res) {
        try {
            const { cycleId } = req.params;
            const { subject, activities } = req.body || {};
            console.log(`[ReviewController] 📥 Recebida requisição DELETE /notion/reviews/cycles/${cycleId}`);
            const result = await ReviewService.invalidateCycle(cycleId, { subject, activities });
            console.log(`[ReviewController] 📤 Ciclo ${cycleId} invalidado com sucesso.`);
            return res.json(result);
        } catch (error) {
            console.error(`[ReviewController] ❌ Erro ao invalidar ciclo ${req.params?.cycleId}:`, error.message);
            const status = error.message.includes("não encontrado") ? 404 : 500;
            return res.status(status).json({ error: error.message });
        }
    }
}

module.exports = ReviewController;
