const { Router } = require('express');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.post('/google', AuthController.loginWithGoogle);
router.get('/verify', authMiddleware, AuthController.verifySession);

module.exports = router;
