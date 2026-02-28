const Category = require("../models/Category.model");
const { slugify } = require("../utils/slug");

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeName = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const buildNameExactRegex = (normalizedName) => {
  const escaped = escapeRegex(normalizedName);
  const wsLoose = escaped.replace(/ /g, "\\s+");
  return new RegExp(`^${wsLoose}$`, "i");
};

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const ensureUniqueSlug = async ({ baseSlug, currentId }) => {
  let slug = baseSlug;
  let i = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await Category.findOne({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    }).select("_id");

    if (!exists) return slug;
    i += 1;
    slug = `${baseSlug}-${i}`;
    if (i > 50) {
      slug = `${baseSlug}-${Date.now()}`;
    }
  }
};

const listCategories = async (req, res, next) => {
  try {
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 20), 100);
    const search =
      typeof req.query?.search === "string" ? req.query.search.trim() : "";

    const wantsHidden =
      String(req.query?.includeHidden || "").toLowerCase() === "true";
    const isAdmin = req.auth?.role === "admin";

    const filter = {};
    if (!(wantsHidden && isAdmin)) {
      filter.isActive = true;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: rx }, { slug: rx }];
    }

    const total = await Category.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (safePage - 1) * limit;

    const items = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      items: items.map((c) => ({
        id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        isActive: Boolean(c.isActive),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      meta: { page: safePage, limit, total, totalPages },
    });
  } catch (err) {
    return next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name)
      return res.status(400).json({ message: "Tên danh mục là bắt buộc" });

    const nameRx = buildNameExactRegex(name);
    const existsName = await Category.findOne({ name: nameRx }).select("_id");
    if (existsName) {
      return res.status(409).json({ message: "Tên danh mục đã tồn tại" });
    }

    const slugInput =
      typeof req.body?.slug === "string" ? req.body.slug.trim() : "";
    const baseSlug = slugify(slugInput || name);
    if (!baseSlug)
      return res.status(400).json({ message: "Slug không hợp lệ" });

    const slug = await ensureUniqueSlug({ baseSlug });

    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";
    const isActive =
      typeof req.body?.isActive === "boolean" ? req.body.isActive : true;

    const c = await Category.create({
      name,
      slug,
      description,
      isActive,
      createdBy: req.auth?.userId,
    });

    return res.status(201).json({
      message: "Tạo danh mục thành công",
      category: {
        id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        isActive: Boolean(c.isActive),
      },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err?.keyPattern?.name) {
        return res.status(409).json({ message: "Tên danh mục đã tồn tại" });
      }
      return res.status(409).json({ message: "Slug đã tồn tại" });
    }
    return next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id danh mục" });

    const c = await Category.findById(id);
    if (!c) return res.status(404).json({ message: "Không tìm thấy danh mục" });

    const updates = {};

    if (typeof req.body?.name === "string") {
      const name = normalizeName(req.body.name);
      if (name) {
        const nameRx = buildNameExactRegex(name);
        const existsName = await Category.findOne({
          _id: { $ne: c._id },
          name: nameRx,
        }).select("_id");
        if (existsName) {
          return res.status(409).json({ message: "Tên danh mục đã tồn tại" });
        }
        updates.name = name;
      }
    }

    if (typeof req.body?.slug === "string") {
      const baseSlug = slugify(req.body.slug);
      if (!baseSlug)
        return res.status(400).json({ message: "Slug không hợp lệ" });
      updates.slug = await ensureUniqueSlug({ baseSlug, currentId: c._id });
    }

    if (
      typeof req.body?.description === "string" ||
      req.body?.description === null
    ) {
      updates.description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";
    }

    if (typeof req.body?.isActive === "boolean") {
      updates.isActive = req.body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có trường hợp lệ để cập nhật" });
    }

    Object.assign(c, updates);
    await c.save();

    return res.json({
      message: "Cập nhật danh mục thành công",
      category: {
        id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        isActive: Boolean(c.isActive),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
    });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err?.keyPattern?.name) {
        return res.status(409).json({ message: "Tên danh mục đã tồn tại" });
      }
      return res.status(409).json({ message: "Slug đã tồn tại" });
    }
    return next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id danh mục" });

    const c = await Category.findByIdAndDelete(id);
    if (!c) return res.status(404).json({ message: "Không tìm thấy danh mục" });

    return res.json({ message: "Xoá danh mục thành công" });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
