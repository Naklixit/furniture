const mongoose = require("mongoose");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");
const { slugify } = require("../utils/slug");
const {
  uploadBuffer,
  deleteResource,
  deleteResourcesByPrefix,
  deleteFolder,
} = require("../services/cloudinary.service");

const mapLimit = async (arr, limit, mapper) => {
  const list = Array.isArray(arr) ? arr : [];
  const size = list.length;
  if (size === 0) return [];

  const concurrency = Math.max(1, Math.min(Number(limit) || 1, size));
  const results = new Array(size);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }).map(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= size) break;
      results[current] = await mapper(list[current], current);
    }
  });

  await Promise.all(workers);
  return results;
};

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

const parseNonNegativeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const ensureUniqueSlug = async ({ baseSlug, currentId }) => {
  let slug = baseSlug;
  let i = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await Product.findOne({
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

const pickProduct = (p) => {
  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId?._id || p.categoryId,
    category:
      p.categoryId && typeof p.categoryId === "object"
        ? {
            id: p.categoryId._id,
            name: p.categoryId.name,
            slug: p.categoryId.slug,
          }
        : null,
    brand: p.brand || "",
    originalPrice: p.originalPrice,
    salePrice: p.salePrice,
    stock: p.stock,
    description: p.description || "",
    specs: p.specs,
    images: p.images,
    ratingAvg: Number(p.ratingAvg || 0),
    ratingCount: Number(p.ratingCount || 0),
    isActive: Boolean(p.isActive),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

const listProducts = async (req, res, next) => {
  try {
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 10), 50);

    const search =
      typeof req.query?.search === "string" ? req.query.search.trim() : "";
    const categoryId =
      typeof req.query?.categoryId === "string"
        ? req.query.categoryId.trim()
        : "";

    const wantsHidden =
      String(req.query?.includeHidden || "").toLowerCase() === "true";
    const isAdmin = req.auth?.role === "admin";

    const filter = {};
    if (!(wantsHidden && isAdmin)) {
      filter.isActive = true;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: rx }, { slug: rx }, { brand: rx }];
    }

    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      filter.categoryId = categoryId;
    }

    const minPrice = parseNonNegativeNumber(req.query?.minPrice, null);
    const maxPrice = parseNonNegativeNumber(req.query?.maxPrice, null);
    if (minPrice !== null || maxPrice !== null) {
      const priceKey = "salePrice";
      filter[priceKey] = {};
      if (minPrice !== null) filter[priceKey].$gte = minPrice;
      if (maxPrice !== null) filter[priceKey].$lte = maxPrice;
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (safePage - 1) * limit;

    const sortKey =
      typeof req.query?.sort === "string" ? req.query.sort : "new";
    const sort =
      sortKey === "price_asc"
        ? { salePrice: 1 }
        : sortKey === "price_desc"
          ? { salePrice: -1 }
          : { createdAt: -1 };

    const items = await Product.find(filter)
      .populate("categoryId", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return res.json({
      items: items.map(pickProduct),
      meta: { page: safePage, limit, total, totalPages },
    });
  } catch (err) {
    return next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id sản phẩm" });

    const p = await Product.findById(id).populate("categoryId", "name slug");
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const isAdmin = req.auth?.role === "admin";
    if (!isAdmin && !p.isActive) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    return res.json({ product: pickProduct(p) });
  } catch (err) {
    return next(err);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const slug =
      typeof req.params?.slug === "string"
        ? req.params.slug.trim().toLowerCase()
        : "";
    if (!slug) return res.status(400).json({ message: "Thiếu slug" });

    const p = await Product.findOne({ slug }).populate(
      "categoryId",
      "name slug",
    );
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const isAdmin = req.auth?.role === "admin";
    if (!isAdmin && !p.isActive) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    return res.json({ product: pickProduct(p) });
  } catch (err) {
    return next(err);
  }
};

const validateSpecs = (body) => {
  const length = parseNonNegativeNumber(body?.length, null);
  const width = parseNonNegativeNumber(body?.width, null);
  const height = parseNonNegativeNumber(body?.height, null);

  if (length === null || width === null || height === null) {
    return { ok: false, message: "Kích thước (dài/rộng/cao) phải là số >= 0" };
  }

  const unit =
    typeof body?.dimensionUnit === "string" ? body.dimensionUnit.trim() : "cm";

  const weightValue = parseNonNegativeNumber(body?.weight, 0);
  if (weightValue === null) {
    return { ok: false, message: "Trọng lượng phải là số >= 0" };
  }

  const weightUnit =
    typeof body?.weightUnit === "string" ? body.weightUnit.trim() : "kg";

  let extra = {};
  if (typeof body?.specsExtra === "string" && body.specsExtra.trim()) {
    try {
      const parsed = JSON.parse(body.specsExtra);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extra = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [
            String(k),
            v == null ? "" : String(v),
          ]),
        );
      }
    } catch {
      return { ok: false, message: "specsExtra phải là JSON object hợp lệ" };
    }
  }

  return {
    ok: true,
    value: {
      dimensions: { length, width, height, unit: unit || "cm" },
      weight: { value: weightValue, unit: weightUnit || "kg" },
      extra,
    },
  };
};

const createProduct = async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name)
      return res.status(400).json({ message: "Tên sản phẩm là bắt buộc" });

    const nameRx = buildNameExactRegex(name);
    const existsName = await Product.findOne({ name: nameRx }).select("_id");
    if (existsName) {
      return res.status(409).json({ message: "Tên sản phẩm đã tồn tại" });
    }

    const categoryId =
      typeof req.body?.categoryId === "string"
        ? req.body.categoryId.trim()
        : "";
    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: "Danh mục không hợp lệ" });
    }

    const category = await Category.findById(categoryId).select("_id isActive");
    if (!category)
      return res.status(400).json({ message: "Danh mục không tồn tại" });

    const originalPrice = parseNonNegativeNumber(req.body?.originalPrice, null);
    if (originalPrice === null) {
      return res.status(400).json({ message: "Giá gốc phải là số >= 0" });
    }

    const salePrice = parseNonNegativeNumber(req.body?.salePrice, 0);
    if (salePrice === null) {
      return res
        .status(400)
        .json({ message: "Giá khuyến mãi phải là số >= 0" });
    }

    if (salePrice > originalPrice) {
      return res
        .status(400)
        .json({ message: "Giá khuyến mãi không được lớn hơn giá gốc" });
    }

    const stock = parseNonNegativeNumber(req.body?.stock, null);
    if (stock === null) {
      return res.status(400).json({ message: "Tồn kho phải là số >= 0" });
    }

    const brand =
      typeof req.body?.brand === "string" ? req.body.brand.trim() : "";
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    const slugInput =
      typeof req.body?.slug === "string" ? req.body.slug.trim() : "";
    const baseSlug = slugify(slugInput || name);
    if (!baseSlug)
      return res.status(400).json({ message: "Slug không hợp lệ" });

    const slug = await ensureUniqueSlug({ baseSlug });

    const specsResult = validateSpecs(req.body);
    if (!specsResult.ok)
      return res.status(400).json({ message: specsResult.message });

    const isActive =
      typeof req.body?.isActive === "boolean" ? req.body.isActive : true;

    const p = await Product.create({
      name,
      slug,
      categoryId,
      brand,
      originalPrice,
      salePrice,
      stock,
      description,
      specs: specsResult.value,
      isActive,
      createdBy: req.auth?.userId,
      updatedBy: req.auth?.userId,
    });

    const populated = await Product.findById(p._id).populate(
      "categoryId",
      "name slug",
    );

    return res.status(201).json({
      message: "Tạo sản phẩm thành công",
      product: pickProduct(populated),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err?.keyPattern?.name) {
        return res.status(409).json({ message: "Tên sản phẩm đã tồn tại" });
      }
      return res.status(409).json({ message: "Slug đã tồn tại" });
    }
    return next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id sản phẩm" });

    const p = await Product.findById(id);
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const updates = {};

    if (typeof req.body?.name === "string") {
      const name = normalizeName(req.body.name);
      if (name) {
        const nameRx = buildNameExactRegex(name);
        const existsName = await Product.findOne({
          _id: { $ne: p._id },
          name: nameRx,
        }).select("_id");
        if (existsName) {
          return res.status(409).json({ message: "Tên sản phẩm đã tồn tại" });
        }
        updates.name = name;
      }
    }

    if (typeof req.body?.categoryId === "string") {
      const categoryId = req.body.categoryId.trim();
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ message: "Danh mục không hợp lệ" });
      }
      const c = await Category.findById(categoryId).select("_id");
      if (!c)
        return res.status(400).json({ message: "Danh mục không tồn tại" });
      updates.categoryId = categoryId;
    }

    if (typeof req.body?.brand === "string" || req.body?.brand === null) {
      updates.brand =
        typeof req.body.brand === "string" ? req.body.brand.trim() : "";
    }

    if (req.body?.originalPrice !== undefined) {
      const originalPrice = parseNonNegativeNumber(
        req.body?.originalPrice,
        null,
      );
      if (originalPrice === null)
        return res.status(400).json({ message: "Giá gốc phải là số >= 0" });
      updates.originalPrice = originalPrice;
    }

    if (req.body?.salePrice !== undefined) {
      const salePrice = parseNonNegativeNumber(req.body?.salePrice, null);
      if (salePrice === null)
        return res
          .status(400)
          .json({ message: "Giá khuyến mãi phải là số >= 0" });
      updates.salePrice = salePrice;
    }

    if (
      updates.originalPrice !== undefined ||
      updates.salePrice !== undefined
    ) {
      const nextOriginal = updates.originalPrice ?? p.originalPrice;
      const nextSale = updates.salePrice ?? p.salePrice;
      if (nextSale > nextOriginal) {
        return res
          .status(400)
          .json({ message: "Giá khuyến mãi không được lớn hơn giá gốc" });
      }
    }

    if (req.body?.stock !== undefined) {
      const stock = parseNonNegativeNumber(req.body?.stock, null);
      if (stock === null)
        return res.status(400).json({ message: "Tồn kho phải là số >= 0" });
      updates.stock = stock;
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

    if (typeof req.body?.slug === "string") {
      const baseSlug = slugify(req.body.slug);
      if (!baseSlug)
        return res.status(400).json({ message: "Slug không hợp lệ" });
      updates.slug = await ensureUniqueSlug({ baseSlug, currentId: p._id });
    }

    const shouldUpdateSpecs =
      req.body?.length !== undefined ||
      req.body?.width !== undefined ||
      req.body?.height !== undefined ||
      req.body?.dimensionUnit !== undefined ||
      req.body?.weight !== undefined ||
      req.body?.weightUnit !== undefined ||
      req.body?.specsExtra !== undefined;

    if (shouldUpdateSpecs) {
      const specsResult = validateSpecs({
        length: req.body?.length ?? p.specs?.dimensions?.length,
        width: req.body?.width ?? p.specs?.dimensions?.width,
        height: req.body?.height ?? p.specs?.dimensions?.height,
        dimensionUnit: req.body?.dimensionUnit ?? p.specs?.dimensions?.unit,
        weight: req.body?.weight ?? p.specs?.weight?.value,
        weightUnit: req.body?.weightUnit ?? p.specs?.weight?.unit,
        specsExtra:
          req.body?.specsExtra ??
          JSON.stringify(Object.fromEntries(p.specs?.extra || [])),
      });
      if (!specsResult.ok)
        return res.status(400).json({ message: specsResult.message });
      updates.specs = specsResult.value;
    }

    if (typeof req.body?.isActive === "boolean") {
      updates.isActive = req.body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có trường hợp lệ để cập nhật" });
    }

    updates.updatedBy = req.auth?.userId;

    Object.assign(p, updates);
    await p.save();

    const populated = await Product.findById(p._id).populate(
      "categoryId",
      "name slug",
    );
    return res.json({
      message: "Cập nhật sản phẩm thành công",
      product: pickProduct(populated),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err?.keyPattern?.name) {
        return res.status(409).json({ message: "Tên sản phẩm đã tồn tại" });
      }
      return res.status(409).json({ message: "Slug đã tồn tại" });
    }
    return next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id sản phẩm" });

    const p = await Product.findByIdAndDelete(id);
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // best-effort cleanup cloudinary
    const publicIds = [];
    if (p.images?.main?.publicId) publicIds.push(p.images.main.publicId);
    (p.images?.gallery || []).forEach(
      (img) => img?.publicId && publicIds.push(img.publicId),
    );
    await Promise.all(publicIds.map((pid) => deleteResource(pid)));

    // extra safety: delete any orphaned resources in the product folder
    const folder = `furniture/products/${p._id}`;
    await deleteResourcesByPrefix(`${folder}/`);
    await deleteFolder(folder);

    return res.json({ message: "Xoá sản phẩm thành công" });
  } catch (err) {
    return next(err);
  }
};

const setProductImages = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id sản phẩm" });

    const p = await Product.findById(id);
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const mainFile = (req.files?.mainImage || [])[0] || null;
    const galleryFiles = req.files?.galleryImages || [];

    const hasAny = Boolean(
      mainFile || (galleryFiles && galleryFiles.length > 0),
    );
    if (!hasAny) {
      return res.status(400).json({ message: "Thiếu file ảnh upload" });
    }

    // nếu update ảnh thì yêu cầu đủ main + >=3 gallery
    if (!mainFile) {
      return res.status(400).json({ message: "Cần chọn ảnh main" });
    }
    if (!Array.isArray(galleryFiles) || galleryFiles.length < 3) {
      return res.status(400).json({ message: "Cần ít nhất 3 ảnh gallery" });
    }

    const folder = `furniture/products/${p._id}`;

    const [uploadedMain, uploadedGallery] = await Promise.all([
      uploadBuffer({
        buffer: mainFile.buffer,
        folder,
        publicId: "main",
      }),
      mapLimit(galleryFiles, 4, (f, i) =>
        uploadBuffer({
          buffer: f.buffer,
          folder,
          publicId: `gallery_${i + 1}`,
        }),
      ),
    ]);

    // collect old ids for best-effort cleanup (avoid deleting newly overwritten ones)
    const oldPublicIds = [];
    if (p.images?.main?.publicId) oldPublicIds.push(p.images.main.publicId);
    (p.images?.gallery || []).forEach(
      (img) => img?.publicId && oldPublicIds.push(img.publicId),
    );

    const newPublicIds = [
      uploadedMain.public_id,
      ...uploadedGallery.map((r) => r.public_id),
    ].filter(Boolean);

    p.images = {
      main: {
        url: uploadedMain.secure_url,
        publicId: uploadedMain.public_id,
        width: uploadedMain.width || 0,
        height: uploadedMain.height || 0,
      },
      gallery: uploadedGallery.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
        width: r.width || 0,
        height: r.height || 0,
      })),
    };

    p.updatedBy = req.auth?.userId;
    await p.save();

    const toDelete = Array.from(new Set(oldPublicIds))
      .filter(Boolean)
      .filter((pid) => !newPublicIds.includes(pid));
    await Promise.all(toDelete.map((pid) => deleteResource(pid)));

    const populated = await Product.findById(p._id).populate(
      "categoryId",
      "name slug",
    );
    return res.json({
      message: "Cập nhật ảnh sản phẩm thành công",
      product: pickProduct(populated),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductImages,
};
