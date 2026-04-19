// Servicio base del modulo de auditoria.
async function describeAuditoriaModule() {
    return {
        module: 'auditoria',
        implemented: false,
        message: 'Modulo de auditoria inicializado; logica pendiente.'
    };
}

module.exports = {
    describeAuditoriaModule
};
