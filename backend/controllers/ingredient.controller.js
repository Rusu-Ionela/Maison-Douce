const Ingredient = require('../models/ingredient.model');

// Adaugă un ingredient
exports.createIngredient = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.cantitate != null) payload.cantitate = Number(payload.cantitate);
        if (payload.costUnitate != null) payload.costUnitate = Number(payload.costUnitate);
        if (payload.pretUnitate != null) payload.pretUnitate = Number(payload.pretUnitate);
        const ingredient = new Ingredient(payload);
        await ingredient.save();
        res.status(201).json(ingredient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Afișează toate ingredientele
exports.getAllIngredients = async (req, res) => {
    try {
        const q = {};
        if (req.query.tip) q.tip = req.query.tip;
        const ingredients = await Ingredient.find(q).sort({ creatLa: -1 });
        res.json(ingredients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizează un ingredient
exports.updateIngredient = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.cantitate != null) payload.cantitate = Number(payload.cantitate);
        if (payload.costUnitate != null) payload.costUnitate = Number(payload.costUnitate);
        if (payload.pretUnitate != null) payload.pretUnitate = Number(payload.pretUnitate);
        const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, payload, { new: true });
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
