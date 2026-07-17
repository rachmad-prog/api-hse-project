// Helper untuk pagination, filtering, sorting sederhana pada query Prisma
function buildQueryOptions(reqQuery, { searchableFields = [], defaultSort = 'createdAt' } = {}) {
  const page = Math.max(parseInt(reqQuery.page) || 1, 1);
  const limit = Math.min(parseInt(reqQuery.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const where = {};

  if (reqQuery.search && searchableFields.length) {
    where.OR = searchableFields.map((field) => ({
      [field]: { contains: reqQuery.search, mode: 'insensitive' },
    }));
  }

  if (reqQuery.status) where.status = reqQuery.status;

  const orderBy = {
    [reqQuery.sortBy || defaultSort]: reqQuery.order === 'asc' ? 'asc' : 'desc',
  };

  return { where, skip, take: limit, orderBy, page, limit };
}

module.exports = { buildQueryOptions };
