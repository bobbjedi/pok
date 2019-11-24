const Store = require('./Store');

module.exports = (req, res) => res.json(Store.system);
