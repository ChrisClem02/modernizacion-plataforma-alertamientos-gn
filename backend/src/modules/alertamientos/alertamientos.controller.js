// El controlador mantiene el contrato HTTP del modulo de alertamientos
// deliberadamente pequeno: recibe parametros, delega al servicio y devuelve
// respuestas JSON sin meter logica de negocio en la capa de transporte.
const alertamientosService = require('./alertamientos.service');

async function createManualAlertamiento(req, res) {
    const response = await alertamientosService.createManualAlertamiento(req.body, req.user);

    return res.status(201).json(response);
}

async function updateAlertamientoStatus(req, res) {
    const response = await alertamientosService.updateAlertamientoStatus(
        req.params.id,
        req.body,
        req.user
    );

    return res.status(200).json(response);
}

async function listAlertamientos(req, res) {
    const response = await alertamientosService.listAlertamientos({
        userContext: req.user,
        filters: req.query,
        pagination: req.query
    });

    return res.status(200).json(response);
}

async function getAlertamientoById(req, res) {
    const response = await alertamientosService.getVisibleAlertamientoDetailById(
        req.params.id,
        req.user
    );

    return res.status(200).json({
        data: response
    });
}

async function getAlertamientoHistorialById(req, res) {
    const response = await alertamientosService.getVisibleAlertamientoHistorialById(
        req.params.id,
        req.user
    );

    return res.status(200).json(response);
}

module.exports = {
    createManualAlertamiento,
    updateAlertamientoStatus,
    listAlertamientos,
    getAlertamientoById,
    getAlertamientoHistorialById
};
