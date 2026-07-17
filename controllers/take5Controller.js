const createCrudController = require('./genericController');
module.exports = createCrudController('take5', { searchableFields: ['task', 'hazards', 'controls'] });
