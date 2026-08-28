const { Router } = require('express');
const AuthController = require('../controllers/AuthController');

const router = Router();

router.post('/google', AuthController.loginWithGoogle);

module.exports = router;
