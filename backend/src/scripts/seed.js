require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/connectDB");
const Category = require("../models/Category.model");
const Product = require("../models/Product.model");
const { slugify } = require("../utils/slug");

const hasFlag = (flag) => process.argv.slice(2).includes(flag);

const ensureCategory = async ({ name, description }) => {
  const slug = slugify(name);
  const existing = await Category.findOne({ slug }).select("_id name slug");
  if (existing) return existing;

  return Category.create({
    name,
    slug,
    description: description || "",
    isActive: true,
  });
};

const main = async () => {
  const wipe = hasFlag("--wipe") || hasFlag("--reset");

  await connectDB();

  if (wipe) {
    const p = await Product.deleteMany({});
    const c = await Category.deleteMany({});
    console.log(
      `Wiped products: ${p.deletedCount || 0}, categories: ${c.deletedCount || 0}`,
    );
  }

  const totalProducts = await Product.countDocuments({});
  if (totalProducts > 0 && !wipe) {
    console.log(
      `DB already has ${totalProducts} products. Skip seeding (use --wipe to reset).`,
    );
    return;
  }

  const categoriesSeed = [
    { name: "Sofa", description: "Sofa hiện đại cho phòng khách" },
    { name: "Bàn", description: "Bàn ăn, bàn trà, bàn làm việc" },
    { name: "Ghế", description: "Ghế thư giãn, ghế ăn" },
    { name: "Giường", description: "Giường ngủ êm ái" },
  ];

  const categories = {};
  for (const c of categoriesSeed) {
    const created = await ensureCategory(c);
    categories[c.name] = created;
  }

  const productsSeed = [
    {
      name: "Sofa vải Nordic",
      category: "Sofa",
      brand: "Fradel",
      originalPrice: 12900000,
      salePrice: 9900000,
      stock: 12,
      ratingAvg: 4.8,
      ratingCount: 132,
    },
    {
      name: "Sofa da tối giản",
      category: "Sofa",
      brand: "Fradel",
      originalPrice: 18900000,
      salePrice: 0,
      stock: 6,
      ratingAvg: 4.6,
      ratingCount: 58,
    },
    {
      name: "Bàn ăn gỗ sồi 6 ghế",
      category: "Bàn",
      brand: "OakCo",
      originalPrice: 15900000,
      salePrice: 13900000,
      stock: 8,
      ratingAvg: 4.7,
      ratingCount: 41,
    },
    {
      name: "Bàn trà mặt đá",
      category: "Bàn",
      brand: "StoneLine",
      originalPrice: 5900000,
      salePrice: 4490000,
      stock: 20,
      ratingAvg: 4.5,
      ratingCount: 26,
    },
    {
      name: "Ghế thư giãn bọc nỉ",
      category: "Ghế",
      brand: "Comfort",
      originalPrice: 4200000,
      salePrice: 0,
      stock: 30,
      ratingAvg: 4.4,
      ratingCount: 12,
    },
    {
      name: "Ghế ăn gỗ cao su",
      category: "Ghế",
      brand: "Wooden",
      originalPrice: 1200000,
      salePrice: 950000,
      stock: 60,
      ratingAvg: 4.3,
      ratingCount: 17,
    },
    {
      name: "Giường ngủ gỗ óc chó",
      category: "Giường",
      brand: "Walnut",
      originalPrice: 22900000,
      salePrice: 19900000,
      stock: 4,
      ratingAvg: 4.9,
      ratingCount: 9,
    },
    {
      name: "Giường bọc nệm hiện đại",
      category: "Giường",
      brand: "SoftBed",
      originalPrice: 17500000,
      salePrice: 0,
      stock: 7,
      ratingAvg: 4.2,
      ratingCount: 11,
    },
  ];

  const existingSlugs = new Set(
    (await Product.find({}).select("slug")).map((p) => String(p.slug)),
  );

  const docs = [];
  for (const p of productsSeed) {
    const category = categories[p.category];
    if (!category?._id) continue;

    let baseSlug = slugify(p.name);
    if (!baseSlug) baseSlug = `product-${Date.now()}`;

    let slug = baseSlug;
    let i = 0;
    while (existingSlugs.has(slug)) {
      i += 1;
      slug = `${baseSlug}-${i}`;
      if (i > 50) slug = `${baseSlug}-${Date.now()}`;
    }
    existingSlugs.add(slug);

    docs.push({
      name: p.name,
      slug,
      categoryId: category._id,
      brand: p.brand || "",
      originalPrice: p.originalPrice,
      salePrice: p.salePrice,
      stock: p.stock,
      description: "Sản phẩm demo để test UI trang chủ.",
      specs: {
        dimensions: { length: 100, width: 60, height: 75, unit: "cm" },
        weight: { value: 10, unit: "kg" },
        extra: { material: "Gỗ/kim loại (demo)", color: "Tự nhiên" },
      },
      images: { main: null, gallery: [] },
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      isActive: true,
    });
  }

  const inserted = await Product.insertMany(docs);
  console.log(
    `Seeded categories: ${Object.keys(categories).length}, products: ${inserted.length}`,
  );
};

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
    }
  });
