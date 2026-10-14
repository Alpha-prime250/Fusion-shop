const express = require('express');
const Category = require('../models/category');
const auth = require('../middleware/auth');
const { loadUser, requireRole } = require('../middleware/role');

const router = express.Router();

// Public: list all active categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Public: get a single category by slug or id
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const category = idOrSlug.match(/^[0-9a-fA-F]{24}$/)
      ? await Category.findById(idOrSlug)
      : await Category.findOne({ slug: idOrSlug });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Admin only: create category
router.post('/', auth, loadUser, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, image, parent } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) return res.status(400).json({ error: 'Category already exists' });

    const category = new Category({ name: name.trim(), description, image, parent: parent || null });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Admin only: update category
router.put('/:id', auth, loadUser, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, image, parent, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (parent !== undefined) category.parent = parent || null;
    if (isActive !== undefined) category.isActive = isActive;

    // Regenerate slug if name changed
    if (name) {
      category.slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Admin only: delete category
router.delete('/:id', auth, loadUser, requireRole('admin'), async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
