// Servicio placeholder. Aqui se colocara la logica de autenticacion en una
// iteracion posterior, sin romper la estructura inicial del backend.

async function describeAuthModule() {
    return {
        module: 'auth',
        implemented: false,
        message: 'Modulo de autenticacion inicializado; logica pendiente.'
    };
}

module.exports = {
    describeAuthModule
};
