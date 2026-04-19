const app = require('./app');
const env = require('./config/env');

// El arranque se deja pequeno y directo para que la responsabilidad de
// configuracion permanezca en app.js y config/env.js.
app.listen(env.BACKEND_PORT, () => {
    console.log(`[backend] Servidor escuchando en http://localhost:${env.BACKEND_PORT}`);
});
