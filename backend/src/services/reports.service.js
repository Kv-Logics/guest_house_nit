const reportsRepository = require('../repositories/reports.repository');

exports.getMonthlyRevenue = async (year, month) => {
    // If year and month not provided, default to current month
    const targetDate = year && month ? new Date(year, month - 1, 1) : new Date();
    return await reportsRepository.getMonthlyRevenue(targetDate);
};
