// Servicio base del modulo de usuarios. En esta iteracion solo deja un punto
// de extension estable para cuando inicie la logica real de negocio.
async function describeUsuariosModule() {
    return {
        module: 'usuarios',
        implemented: false,
        message: 'Modulo de usuarios inicializado; logica pendiente.'
    };
}

module.exports = {
    describeUsuariosModule
};
