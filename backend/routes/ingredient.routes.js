const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredient.controller');
const { authRequired, roleCheck } = require("../middleware/auth");

router.get(
  '/dashboard',
  authRequired,
  roleCheck("admin", "patiser"),
  ingredientController.getInventoryDashboard
);
router.post(
  '/check-alerts',
  authRequired,
  roleCheck("admin", "patiser"),
  ingredientController.checkIngredientAlerts
);

router.post('/', authRequired, roleCheck("admin", "patiser"), ingredientController.createIngredient);
router.get('/', authRequired, roleCheck("admin", "patiser"), ingredientController.getAllIngredients);
router.put('/:id', authRequired, roleCheck("admin", "patiser"), ingredientController.updateIngredient);
router.delete('/:id', authRequired, roleCheck("admin", "patiser"), ingredientController.deleteIngredient);

module.exports = router;
