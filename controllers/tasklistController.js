const createCrudController = require('./genericController');
module.exports = createCrudController('tasklist', { searchableFields: ['title', 'description'] });
