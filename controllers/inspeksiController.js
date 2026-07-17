const createCrudController = require('./genericController');
module.exports = createCrudController('inspeksi', { searchableFields: ['area'] });
