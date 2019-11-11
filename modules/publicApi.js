const Store = require('../helpers/Store');

module.exports = (req, res) => res.json(Store.system);
