const reportsService = require('../services/reports.service');
const { sendSuccess } = require('../utils/response');

exports.getMonthlyRevenue = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const data = await reportsService.getMonthlyRevenue(year, month);
        return sendSuccess(res, 'Monthly revenue report retrieved successfully', data);
    } catch (error) {
        next(error);
    }
};
