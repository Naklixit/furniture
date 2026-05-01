const Product = require("../models/Product.model");

const sumQtyByProductId = (items) => {
  const list = Array.isArray(items) ? items : [];
  const map = new Map();

  for (const it of list) {
    const id = it?.productId ? String(it.productId).trim() : "";
    const qtyRaw = Number(it?.qty || 0);
    const qty = Number.isFinite(qtyRaw) ? Math.max(0, Math.round(qtyRaw)) : 0;
    if (!id || qty <= 0) continue;
    map.set(id, (map.get(id) || 0) + qty);
  }

  return Array.from(map.entries()).map(([productId, qty]) => ({
    productId,
    qty,
  }));
};

const isStockDeductStatus = (status) => {
  const s = typeof status === "string" ? status.trim() : "";
  return s === "shipping" || s === "completed";
};

const adjustInventoryForStatus = async ({ order, nextStatus, session }) => {
  if (!order) return;

  const prevAdjusted = Boolean(order.inventoryAdjusted);
  const needDeduct = isStockDeductStatus(nextStatus);

  if (needDeduct && !prevAdjusted) {
    const aggregated = sumQtyByProductId(order.items);
    const applied = [];

    try {
      for (const it of aggregated) {
        const updated = await Product.findOneAndUpdate(
          { _id: it.productId, stock: { $gte: it.qty } },
          { $inc: { stock: -it.qty } },
          { new: false, session },
        );

        if (!updated) {
          const err = new Error(
            "Không đủ tồn kho để chuyển trạng thái đơn hàng",
          );
          err.statusCode = 400;
          throw err;
        }

        applied.push(it);
      }

      order.inventoryAdjusted = true;
      order.inventoryAdjustedAt = new Date();
      order.inventoryRestoredAt = null;
      return;
    } catch (e) {
      // Best-effort rollback (when not in a transaction)
      for (const it of applied) {
        try {
          await Product.updateOne(
            { _id: it.productId },
            { $inc: { stock: it.qty } },
            { session },
          );
        } catch {
          // ignore
        }
      }
      throw e;
    }
  }

  // If leaving shipping/completed (e.g. cancel/revert), restore stock once.
  if (!needDeduct && prevAdjusted) {
    const aggregated = sumQtyByProductId(order.items);
    if (aggregated.length) {
      const ops = aggregated.map((it) => ({
        updateOne: {
          filter: { _id: it.productId },
          update: { $inc: { stock: it.qty } },
        },
      }));
      await Product.bulkWrite(ops, { ordered: true, session });
    }

    order.inventoryAdjusted = false;
    order.inventoryRestoredAt = new Date();
  }
};

module.exports = {
  adjustInventoryForStatus,
  // exported for potential reuse/tests
  sumQtyByProductId,
  isStockDeductStatus,
};
