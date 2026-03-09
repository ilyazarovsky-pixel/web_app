/**
 * Middleware для валидации данных на базе Joi
 * Перенесён из GameLibrary для использования в API
 */

const Joi = require('joi');

// Схема для регистрации пользователя
const userRegistrationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required(),
  birthDate: Joi.date().iso().optional().allow(null, '')
});

// Схема для обновления профиля
const userUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
  birthDate: Joi.date().iso().optional().allow(null, '')
});

// Схема для курса
const courseSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow(''),
  instructor: Joi.string().max(255).optional().allow(''),
  duration: Joi.number().integer().positive().optional().allow(null),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional()
});

// Схема для отзыва
const reviewSchema = Joi.object({
  course_id: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(10).required(),
  review_text: Joi.string().max(2000).optional().allow('')
});

// Схема для статистики
const statsSchema = Joi.object({
  course_id: Joi.number().integer().positive().optional(),
  user_id: Joi.number().integer().positive().optional(),
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().optional()
});

/**
 * Factory function для создания middleware валидации
 * @param {Joi.ObjectSchema} schema - Joi схема для валидации
 * @returns {Function} Middleware функция
 */
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
}

module.exports = {
  validate,
  userRegistrationSchema,
  userUpdateSchema,
  courseSchema,
  reviewSchema,
  statsSchema
};
