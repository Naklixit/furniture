const User = require("../models/User.model");

const pickUser = (user) => {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    address: user.address || "",
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const buildUserSearchQuery = (rawSearch) => {
  const search = typeof rawSearch === "string" ? rawSearch.trim() : "";
  if (!search) return {};

  const escaped = escapeRegex(search);
  const rx = new RegExp(escaped, "i");
  const digits = search.replace(/\D/g, "");

  const or = [{ fullName: rx }, { email: rx }];
  if (digits.length > 0) {
    or.push({ phoneNumber: new RegExp(escapeRegex(digits), "i") });
  }

  return { $or: or };
};

const getMe = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    return res.json({ user: pickUser(user) });
  } catch (err) {
    return next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    const { fullName, phoneNumber, address } = req.body || {};

    const updates = {};

    if (typeof fullName === "string") {
      const nextFullName = fullName.trim();
      if (nextFullName.length > 0) updates.fullName = nextFullName;
    }

    if (typeof phoneNumber === "string" || phoneNumber === null) {
      const rawPhone = typeof phoneNumber === "string" ? phoneNumber : "";
      const digitsOnly = rawPhone.replace(/\D/g, "");

      // Cho phép xoá số điện thoại
      if (digitsOnly.length === 0) {
        updates.phoneNumber = "";
      } else if (digitsOnly.length === 10) {
        updates.phoneNumber = digitsOnly;
      } else {
        return res
          .status(400)
          .json({ message: "Số điện thoại phải gồm đúng 10 chữ số" });
      }
    }

    if (typeof address === "string" || address === null) {
      const nextAddress = typeof address === "string" ? address.trim() : "";
      updates.address = nextAddress;
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có trường hợp lệ để cập nhật" });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    return res.json({
      message: "Cập nhật hồ sơ thành công",
      user: pickUser(user),
    });
  } catch (err) {
    // Trùng số điện thoại
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Số điện thoại đã được sử dụng" });
    }

    return next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 10), 50);

    const filter = buildUserSearchQuery(req.query?.search);

    const [total, totalUsers, totalAdmins] = await Promise.all([
      User.countDocuments(filter),
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (safePage - 1) * limit;

    const items = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      items: items.map(pickUser),
      meta: {
        page: safePage,
        limit,
        total,
        totalPages,
        stats: {
          totalUsers,
          totalAdmins,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const actorId = req.auth?.userId;
    if (!actorId)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    const targetId = req.params?.id;
    if (!targetId)
      return res.status(400).json({ message: "Thiếu id người dùng" });
    if (String(targetId) === String(actorId)) {
      return res.status(403).json({ message: "Không thể tự thay đổi quyền" });
    }

    const nextRole = req.body?.role;
    if (nextRole !== "customer" && nextRole !== "admin") {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const target = await User.findById(targetId);
    if (!target)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    // Không cho admin chỉnh role của admin khác
    if (target.role === "admin") {
      return res
        .status(403)
        .json({ message: "Không thể chỉnh quyền của Admin" });
    }

    target.role = nextRole;
    await target.save();

    return res.json({
      message: "Cập nhật quyền thành công",
      user: pickUser(target),
    });
  } catch (err) {
    return next(err);
  }
};

const deleteUserById = async (req, res, next) => {
  try {
    const actorId = req.auth?.userId;
    if (!actorId)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    const targetId = req.params?.id;
    if (!targetId)
      return res.status(400).json({ message: "Thiếu id người dùng" });

    if (String(targetId) === String(actorId)) {
      return res.status(403).json({ message: "Không thể tự xoá tài khoản" });
    }

    const target = await User.findById(targetId).select("role");
    if (!target)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    // Không cho admin xoá admin khác
    if (target.role === "admin") {
      return res.status(403).json({ message: "Không thể xoá Admin" });
    }

    await User.findByIdAndDelete(targetId);

    return res.json({ message: "Xoá người dùng thành công" });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getMe, updateMe, listUsers, updateUserRole, deleteUserById };
