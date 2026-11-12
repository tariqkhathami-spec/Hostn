const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Get published blog posts
// @route   GET /api/v1/blog/posts
// A slug the admin did not type is derived from the English title (or made
// unique with a short suffix) so creating content never fails on a hidden field.
function makeSlug(text) {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'item'}-${Date.now().toString(36).slice(-5)}`;
}
// One language is enough to start with; the other falls back to it.
function bothLanguages(value) {
  if (typeof value === 'string') return { en: value, ar: value };
  const v = value || {};
  return { ...v, en: v.en || v.ar, ar: v.ar || v.en };
}

// @access  Public
exports.getPosts = async (req, res, next) => {
  try {
    const { category, tag, page = 1, limit = 20, published } = req.query;

    const filter = {};

    // Public visitors only see published posts; admins can see all
    if (published === 'true' || !req.user || req.user.role !== 'admin') {
      filter.isPublished = true;
    }

    if (category) filter.category = category;
    if (tag) filter.tags = tag;

    const skip = (Number(page) - 1) * Number(limit);

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .populate('category', 'name slug')
        .populate('author', 'name avatar')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      BlogPost.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog post by slug
// @route   GET /api/v1/blog/posts/:slug
// @access  Public
exports.getPost = async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug })
      .populate('category', 'name slug')
      .populate('author', 'name avatar')
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blog categories
// @route   GET /api/v1/blog/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await BlogCategory.find().sort({ 'name.en': 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

// @desc    Create blog post
// @route   POST /api/v1/blog/posts
// @access  Admin
exports.createPost = async (req, res, next) => {
  try {
    const { excerpt, content, coverImage, category, tags, isPublished } = req.body;
    const title = bothLanguages(req.body.title);
    if (!title.en || !title.ar) {
      return res.status(400).json({ success: false, message: 'A title is required' });
    }
    const slug = req.body.slug || makeSlug(req.body.title && req.body.title.en ? req.body.title.en : '');

    const existing = await BlogPost.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A post with this slug already exists' });
    }

    const post = await BlogPost.create({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category: category || null,
      author: req.user._id,
      tags: tags || [],
      isPublished: isPublished || false,
    });

    const populated = await BlogPost.findById(post._id)
      .populate('category', 'name slug')
      .populate('author', 'name avatar')
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update blog post
// @route   PUT /api/v1/blog/posts/:id
// @access  Admin
exports.updatePost = async (req, res, next) => {
  try {
    const { title, slug, excerpt, content, coverImage, category, tags, isPublished } = req.body;

    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== post.slug) {
      const existing = await BlogPost.findOne({ slug, _id: { $ne: post._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A post with this slug already exists' });
      }
    }

    if (title) post.title = title;
    if (slug) post.slug = slug;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (content !== undefined) post.content = content;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (category !== undefined) post.category = category || null;
    if (tags !== undefined) post.tags = tags;
    if (isPublished !== undefined) post.isPublished = isPublished;

    await post.save();

    const populated = await BlogPost.findById(post._id)
      .populate('category', 'name slug')
      .populate('author', 'name avatar')
      .lean();

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete blog post
// @route   DELETE /api/v1/blog/posts/:id
// @access  Admin
exports.deletePost = async (req, res, next) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Create blog category
// @route   POST /api/v1/blog/categories
// @access  Admin
exports.createCategory = async (req, res, next) => {
  try {
    const name = bothLanguages(req.body.name);
    if (!name.en || !name.ar) {
      return res.status(400).json({ success: false, message: 'A name is required' });
    }
    const slug = req.body.slug || makeSlug(req.body.name && req.body.name.en ? req.body.name.en : '');

    const existing = await BlogCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A category with this slug already exists' });
    }

    const category = await BlogCategory.create({ name, slug });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete blog category
// @route   DELETE /api/v1/blog/categories/:id
// @access  Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Remove category reference from posts
    await BlogPost.updateMany({ category: category._id }, { $set: { category: null } });

    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};
