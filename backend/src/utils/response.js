exports.sendSuccess = (res, message, data = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

exports.sendError = (res, message, statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message
    };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
};