const { ValidationError } = require("../utils/validation");
const { cleanupUploadedFiles } = require("../utils/multer");

function withValidation(buildInput, handler) {
  return async (req, res, next) => {
    try {
      req.validated = buildInput(req);
      return await handler(req, res, next);
    } catch (err) {
      if (err instanceof ValidationError) {
        cleanupUploadedFiles(req);
        return res.status(err.status || 400).json({
          message: err.message,
          details: err.details || [],
        });
      }
      return next(err);
    }
  };
}

module.exports = {
  withValidation,
};
