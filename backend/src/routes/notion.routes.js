const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Aplica a proteção em todas as rotas de notion
router.use(authMiddleware);

// Rota de teste
router.get('/status', (req, res) => {
    res.json({ message: "API do Notion rodando de forma segura!", user: req.user.email });
});

module.exports = router;
