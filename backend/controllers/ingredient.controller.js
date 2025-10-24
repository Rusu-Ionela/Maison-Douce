const Ingredient = require('../models/ingredient.model');

// Adaugă un ingredient
exports.createIngredient = async (req, res) => {
    try {
        const ingredient = new Ingredient(req.body);
        await ingredient.save();
        res.status(201).json(ingredient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Afișează toate ingredientele
exports.getAllIngredients = async (req, res) => {
    try {
        const ingredients = await Ingredient.find();
        res.json(ingredients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizează un ingredient
exports.updateIngredient = async (req, res) => {
    try {
        const ingredient = await Ingredient.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(ingredient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Șterge un ingredient
exports.deleteIngredient = async (req, res) => {
    try {
        await Ingredient.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ingredient șters cu succes!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
