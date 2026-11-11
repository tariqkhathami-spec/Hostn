// Public articles feed for the mobile apps. Mounted at /api/v1/articles.
// Backed by the blog (BlogPost / BlogCategory): published posts only.
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');
const { escapeRegex } = require('../utils/sanitize');

const SITE_URL = (process.env.CLIENT_URL || 'https://hostn.co').replace(/\/+$/, '');

// GET /api/v1/articles?category=<slug|id>&search=<text>&lang=ar|en&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const lang = req.query.lang === 'en' ? 'en' : 'ar';
    const other = lang === 'ar' ? 'en' : 'ar';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);

    const filter = { isPublished: true };

    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    if (category) {
      if (category.length > 80) return res.json({ success: true, data: [], pagination: { total: 0, page, pages: 0, limit } });
      // The app sends a category key (e.g. "hosting_tips"); blog slugs may use "-" instead of "_".
      const or = [{ slug: category }, { slug: category.replace(/_/g, '-') }];
      if (/^[a-f0-9]{24}$/.test(category)) or.push({ _id: new mongoose.Types.ObjectId(category) });
      const cat = await BlogCategory.findOne({ $or: or }).select('_id').lean();
      if (!cat) return res.json({ success: true, data: [], pagination: { total: 0, page, pages: 0, limit } });
      filter.category = cat._id;
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { 'title.ar': rx }, { 'title.en': rx },
        { 'excerpt.ar': rx }, { 'excerpt.en': rx },
        { tags: rx },
      ];
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .select('title slug excerpt coverImage category publishedAt createdAt')
        .populate('category', 'name slug')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    const data = posts.map((p) => {
      const published = p.publishedAt || p.createdAt;
      return {
        id: String(p._id),
        slug: p.slug,
        title: (p.title && (p.title[lang] || p.title[other])) || '',
        excerpt: (p.excerpt && (p.excerpt[lang] || p.excerpt[other])) || '',
        category: p.category ? p.category.slug : '',
        categoryName: p.category && p.category.name ? (p.category.name[lang] || p.category.name[other]) : '',
        publishedDate: published ? new Date(published).toISOString().slice(0, 10) : '',
        url: `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`,
        thumbnailUrl: p.coverImage || undefined,
      };
    });

    res.json({ success: true, data, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
