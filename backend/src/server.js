const express = require('express');
const cors = require('cors');
const { FRONTEND_URL } = require('./config');

// Routers
const authRoutes = require('./routes/auth.routes');
const notionRoutes = require('./routes/notion.routes');

const app = express();

// Middlewares globais
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// Registro de Rotas
app.use('/api/auth', authRoutes);
app.use('/api/notion', notionRoutes);

module.exports = app;
