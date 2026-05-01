const slugify = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-")
    .replace(/-+/g, "-");
};

module.exports = { slugify };
