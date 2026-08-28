const app = require('./server');
const { PORT } = require('./config');

function start() {
    app.listen(PORT, () => {
        console.log(`Backend rodando na porta ${PORT}`);
    });
}

start();