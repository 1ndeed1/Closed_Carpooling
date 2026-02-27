const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        console.error("VALIDATION FAILED FOR BODY:", JSON.stringify(req.body, null, 2));

        // ZodError objects have an 'issues' array
        const issues = err.issues || err.errors;

        if (issues && Array.isArray(issues)) {
            console.error("VALIDATION ISSUES:", issues.map(e => `${e.path.join(".")}: ${e.message}`));
            return res.status(400).json({
                message: "Validation failed",
                errors: issues.map((e) => ({
                    path: e.path[0],
                    message: e.message,
                })),
            });
        }

        console.error("NON-ZOD ERROR:", err);
        return res.status(500).json({ message: "Internal server error during validation" });
    }
};

module.exports = validate;
