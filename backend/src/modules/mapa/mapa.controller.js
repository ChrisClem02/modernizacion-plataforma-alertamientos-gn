const mapaService = require('./mapa.service');

async function getMapaData(req, res) {
    const response = await mapaService.getMapaData({
        queryParams: req.query,
        userContext: req.user
    });

    return res.status(200).json(response);
}

module.exports = {
    getMapaData
};
