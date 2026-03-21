import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  MapPin,
  ShieldCheck,
  Truck,
  UserRound,
  Phone,
  MapPinned,
  Wallet,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { useCartStore } from "../stores/cart.store";
import { useToast } from "../context/useToast";
import { createOrderCodApi, createVnpayPaymentApi } from "../services/order.api";
import { geoAutocompleteApi, geoReverseApi } from "../services/geo.api";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const formatMoneyVND = (n) => {
  const value = Number(n || 0);
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value) + "đ";
  }
};

const PAYMENT_METHODS = [
  {
    key: "COD",
    title: "Thanh toán khi nhận hàng",
    desc: "Thanh toán bằng tiền mặt khi nhận hàng",
  },
  {
    key: "MOMO",
    title: "Ví MoMo",
    desc: "Thanh toán qua ví điện tử MoMo",
    disabled: true,
  },
  {
    key: "VNPAY",
    title: "VNPay",
    desc: "Thanh toán qua VNPay (ATM/Visa/Master)",
  },
];

function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-3xl border border-gray-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] anim-fade-up " +
        className
      }
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 items-center justify-center shrink-0">
        <Icon size={18} className="text-teal-700" />
      </span>
      <div className="min-w-0">
        <div className="text-base font-bold text-slate-900 leading-6">{title}</div>
        {/* {desc ? <div className="text-xs font-normal text-slate-500 mt-0.5">{desc}</div> : null} */}
      </div>
    </div>
  );
}

function InputShell({ icon: Icon, children }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon size={16} />
      </span>
      {children}
    </div>
  );
}

function MapClick({ onPick }) {
  useMapEvents({
    click(e) {
      const lat = Number(e?.latlng?.lat);
      const lon = Number(e?.latlng?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      onPick({ lat, lon });
    },
  });
  return null;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthed, user } = useAuth();

  const items = useCartStore((s) => s.items || []);
  const discount = useCartStore((s) => s.discount);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const [payMethod, setPayMethod] = useState("VNPAY");
  const [submitting, setSubmitting] = useState(false);

  // Address suggestions
  const [addrQuery, setAddrQuery] = useState("");
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrItems, setAddrItems] = useState([]);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrError, setAddrError] = useState("");
  const addrSeqRef = useRef(0);

  // Map / coordinates
  const [coords, setCoords] = useState({ lat: null, lon: null });
  const [reverseLoading, setReverseLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const defaultCenter = useMemo(() => {
    // Ho Chi Minh City
    return [10.8231, 106.6297];
  }, []);

  const markerPos = useMemo(() => {
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null;
    return [coords.lat, coords.lon];
  }, [coords.lat, coords.lon]);

  const reverseToAddress = async ({ lat, lon }) => {
    try {
      setReverseLoading(true);
      const res = await geoReverseApi({ lat, lon });
      const desc = String(res?.item?.description || "").trim();
      if (desc) {
        setAddress(desc);
        setAddrQuery(desc);
        setAddrOpen(false);
        setAddrError("");
      }
    } catch (err) {
      toast?.error?.(String(err?.message || "Không lấy được địa chỉ từ bản đồ"));
    } finally {
      setReverseLoading(false);
    }
  };


  useEffect(() => {
    if (!isAuthed) {
      navigate("/login", { replace: true });
      return;
    }

    setFullName((prev) => prev || String(user?.fullName || "").trim());
    setPhoneNumber((prev) => prev || String(user?.phoneNumber || "").trim());
    setAddress((prev) => prev || String(user?.address || "").trim());
  }, [isAuthed, navigate, user?.address, user?.fullName, user?.phoneNumber]);

  useEffect(() => {
    if (items.length > 0) return;
    toast?.info?.("Giỏ hàng trống");
    navigate("/cart", { replace: true });
  }, [items.length, navigate, toast]);

  const subtotal = useMemo(() => {
    return (items || []).reduce((sum, it) => {
      const price = Number(it?.price || 0);
      const qty = Math.max(0, Number(it?.qty || 0));
      return sum + price * qty;
    }, 0);
  }, [items]);

  const shippingFee = 0;

  const discountAmount = useMemo(() => {
    const pct = Math.max(0, Math.min(100, Number(discount?.percentOff || 0)));
    if (!pct) return 0;
    return Math.max(0, Math.round((subtotal * pct) / 100));
  }, [discount?.percentOff, subtotal]);

  const finalTotal = useMemo(() => {
    return Math.max(0, Math.round(subtotal - discountAmount + shippingFee));
  }, [discountAmount, shippingFee, subtotal]);

  const normalizedItems = useMemo(() => {
    return (items || [])
      .map((it) => ({ productId: String(it?.productId || ""), qty: Math.max(1, Number(it?.qty || 1)) }))
      .filter((x) => x.productId);
  }, [items]);

  // OSM/Nominatim autocomplete (via backend)
  useEffect(() => {
    const q = String(addrQuery || "").trim();
    if (!q) {
      setAddrItems([]);
      setAddrError("");
      setAddrOpen(false);
      return;
    }

    const seq = (addrSeqRef.current += 1);
    const t = setTimeout(async () => {
      try {
        setAddrError("");
        setAddrLoading(true);
        const res = await geoAutocompleteApi({ input: q });
        if (seq !== addrSeqRef.current) return;
        const list = res?.items || [];
        setAddrItems(Array.isArray(list) ? list : []);
        setAddrOpen(true);
      } catch (err) {
        if (seq !== addrSeqRef.current) return;
        setAddrItems([]);
        setAddrError(String(err?.message || "Không thể tải gợi ý địa chỉ"));
        setAddrOpen(true);
      } finally {
        if (seq !== addrSeqRef.current) return;
        setAddrLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [addrQuery]);

  const submit = async () => {
    if (submitting) return;

    const f = String(fullName || "").trim();
    const p = String(phoneNumber || "").trim();
    const a = String(address || "").trim();

    if (!f) return toast?.error?.("Vui lòng nhập họ và tên");
    if (!p) return toast?.error?.("Vui lòng nhập số điện thoại");
    if (!a) return toast?.error?.("Vui lòng nhập địa chỉ giao hàng");

    if (!normalizedItems.length) return toast?.error?.("Giỏ hàng trống");

    try {
      setSubmitting(true);

      const payload = {
        fullName: f,
        phoneNumber: p,
        address: a,
        note: String(note || "").trim(),
        items: normalizedItems,
        discountCode: String(discount?.code || "").trim().toUpperCase(),
        clientBaseUrl: typeof window !== "undefined" ? window.location.origin : "",
      };

      if (payMethod === "COD") {
        const res = await createOrderCodApi(payload);
        const orderId = res?.order?.id;
        navigate(`/order/success?result=success&orderId=${encodeURIComponent(orderId || "")}`, { replace: true });
        return;
      }

      if (payMethod === "VNPAY") {
        const res = await createVnpayPaymentApi(payload);
        const url = res?.paymentUrl;
        if (!url) throw new Error("Không tạo được link thanh toán VNPay");
        window.location.href = url;
        return;
      }

      toast?.info?.("Phương thức này chưa hỗ trợ");
    } catch (err) {
      toast?.error?.(err?.message || "Không thể đặt hàng");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="flex items-start justify-between gap-6 anim-fade-up">
          <div>
            <div className="inline-flex items-center gap-2 text-slate-900 font-bold text-xl">
              <span className="inline-flex w-9 h-9 rounded-2xl bg-teal-600 text-white items-center justify-center shadow-sm">
                <CreditCard size={18} />
              </span>
              Thanh toán
            </div>
            <div className="mt-1 text-sm text-slate-500">Hoàn tất thông tin giao hàng và chọn phương thức thanh toán.</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <SectionTitle
                icon={MapPin}
                title="Thông tin giao hàng"
                desc="Điền đúng thông tin để shop giao hàng nhanh hơn."
              />

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <InputShell icon={UserRound}>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm outline-none focus:border-teal-300 focus:bg-white"
                      placeholder="Nhập họ và tên"
                    />
                  </InputShell>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <InputShell icon={Phone}>
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm outline-none focus:border-teal-300 focus:bg-white"
                      placeholder="Nhập số điện thoại"
                      inputMode="tel"
                    />
                  </InputShell>
                </div>

                <div className="md:col-span-2 relative">
                  <label className="text-xs font-bold text-slate-700">
                    Địa chỉ giao hàng <span className="text-rose-500">*</span>
                  </label>

                  <InputShell icon={MapPinned}>
                    <input
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setAddrQuery(e.target.value);
                      }}
                      onFocus={() => {
                        if (addrItems.length || addrError) setAddrOpen(true);
                      }}
                      className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm outline-none focus:border-teal-300 focus:bg-white"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    />
                  </InputShell>

                  {addrOpen ? (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-30">
                      {addrLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Đang tải gợi ý...</div>
                      ) : addrError ? (
                        <div className="px-4 py-3 text-sm text-rose-600 font-semibold">{addrError}</div>
                      ) : addrItems.length ? (
                        <div className="max-h-64 overflow-y-auto">
                          {addrItems.map((it) => (
                            <button
                              key={it.placeId}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-gray-50"
                              onClick={() => {
                                setAddress(it.description || "");
                                setAddrQuery("");
                                setAddrError("");
                                const lat = Number(it?.lat);
                                const lon = Number(it?.lon);
                                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                                  setCoords({ lat, lon });
                                }
                                setAddrOpen(false);
                              }}
                            >
                              <div className="text-sm font-extrabold text-slate-900">
                                {it.mainText || it.description}
                              </div>
                              {it.secondaryText ? (
                                <div className="text-xs text-gray-500 mt-0.5">{it.secondaryText}</div>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">Không có gợi ý phù hợp.</div>
                      )}

                      <div className="h-px bg-gray-100" />
                      <button
                        type="button"
                        className="w-full px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
                        onClick={() => setAddrOpen(false)}
                      >
                        Đóng
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                    <button
                      type="button"
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                      onClick={() => setMapOpen((v) => !v)}
                    >
                      <div className="text-xs font-bold text-slate-700">
                        Chọn vị trí trên bản đồ (tuỳ chọn)
                        {reverseLoading ? (
                          <span className="text-slate-500 font-semibold"> · Đang lấy địa chỉ...</span>
                        ) : null}
                      </div>
                      <span className="text-xs font-bold text-teal-700">
                        {mapOpen ? "Ẩn bản đồ" : "Mở bản đồ"}
                      </span>
                    </button>

                    {mapOpen ? (
                      <>
                        <div className="px-4 pb-3 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-500">
                            Tip: Bấm để đặt ghim, kéo ghim để chỉnh.
                          </div>
                          <button
                            type="button"
                            className="text-xs font-extrabold text-teal-700 hover:text-teal-800"
                            onClick={() => {
                              if (!navigator?.geolocation) {
                                toast?.info?.("Trình duyệt không hỗ trợ định vị");
                                return;
                              }
                              navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                  const lat = Number(pos?.coords?.latitude);
                                  const lon = Number(pos?.coords?.longitude);
                                  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
                                  setCoords({ lat, lon });
                                  await reverseToAddress({ lat, lon });
                                },
                                () => toast?.error?.("Không lấy được vị trí hiện tại"),
                                { enableHighAccuracy: true, timeout: 8000 },
                              );
                            }}
                          >
                            Dùng vị trí hiện tại
                          </button>
                        </div>

                        <div className="h-64 border-t border-slate-200 bg-white">
                          <MapContainer
                            center={markerPos || defaultCenter}
                            zoom={markerPos ? 16 : 12}
                            scrollWheelZoom
                            className="w-full h-full"
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapClick
                              onPick={async ({ lat, lon }) => {
                                setCoords({ lat, lon });
                                await reverseToAddress({ lat, lon });
                              }}
                            />

                            {markerPos ? (
                              <Marker
                                position={markerPos}
                                draggable
                                eventHandlers={{
                                  dragend: async (e) => {
                                    const ll = e?.target?.getLatLng?.();
                                    const lat = Number(ll?.lat);
                                    const lon = Number(ll?.lng);
                                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
                                    setCoords({ lat, lon });
                                    await reverseToAddress({ lat, lon });
                                  },
                                }}
                              />
                            ) : null}
                          </MapContainer>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none focus:border-teal-300 focus:bg-white"
                    placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle
                icon={Wallet}
                title="Phương thức thanh toán"
                desc="Chọn 1 phương thức để hoàn tất đơn hàng."
              />

              <div className="mt-4 space-y-3">
                {PAYMENT_METHODS.map((m) => {
                  const active = payMethod === m.key;
                  const disabled = Boolean(m.disabled);

                  const Icon = m.key === "COD" ? Truck : m.key === "VNPAY" ? CreditCard : Wallet;

                  return (
                    <button
                      key={m.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPayMethod(m.key)}
                      className={
                        "w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition " +
                        (disabled
                          ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
                          : active
                            ? "border-teal-600 bg-teal-50"
                            : "border-slate-200 bg-white hover:bg-slate-50")
                      }
                    >
                      <span className={"w-5 h-5 rounded-full border flex items-center justify-center " + (active ? "border-teal-600" : "border-slate-300")}>
                        <span className={"w-2.5 h-2.5 rounded-full " + (active ? "bg-teal-600" : "bg-transparent")} />
                      </span>

                      <span className={"w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 " + (active ? "border-teal-200 bg-white" : "border-slate-200 bg-slate-50")}>
                        <Icon size={18} className={active ? "text-teal-700" : "text-slate-500"} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">{m.title}</div>
                        <div className="text-xs font-normal text-slate-500 mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {payMethod === "VNPAY" ? (
                <div className="mt-3 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 font-semibold">
                  Lưu ý: Bạn sẽ được chuyển đến trang thanh toán VNPay để hoàn tất giao dịch.
                </div>
              ) : null}
            </Card>

            <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-800">
              <span aria-hidden>←</span>
              Quay lại giỏ hàng
            </Link>
          </div>

          <div className="lg:sticky lg:top-24">
            <Card className="p-5">
              <div className="text-sm font-semibold text-slate-900">Đơn hàng của bạn</div>

              <div className="mt-4 space-y-3">
                {(items || []).slice(0, 4).map((it) => {
                  const qty = Math.max(1, Number(it?.qty || 1));
                  return (
                    <div key={it.productId} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 shrink-0">
                          {it?.imageUrl ? (
                            <img src={it.imageUrl} alt={it?.name || ""} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 line-clamp-2">{it?.name || ""}</div>
                          <div className="text-xs text-slate-500">x{qty}</div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {formatMoneyVND(Math.max(0, Number(it?.price || 0)) * qty)}
                      </div>
                    </div>
                  );
                })}
                {items.length > 4 ? (
                  <div className="text-xs text-slate-500">+{items.length - 4} sản phẩm khác</div>
                ) : null}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold">Tạm tính</span>
                  <span className="font-semibold text-slate-900">{formatMoneyVND(subtotal)}</span>
                </div>
                {discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-bold">Giảm giá</span>
                    <span className="font-semibold text-emerald-700">- {formatMoneyVND(discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold">Phí vận chuyển</span>
                  <span className="font-bold text-teal-700">Miễn phí</span>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Tổng cộng</span>
                  <span className="text-lg font-black text-teal-700">{formatMoneyVND(finalTotal)}</span>
                </div>

                <button
                  type="button"
                  className={
                    "mt-3 w-full h-12 rounded-2xl text-white text-sm font-bold transition shadow-[0_10px_24px_rgba(13,148,136,0.25)] " +
                    (submitting
                      ? "bg-teal-600/70 cursor-not-allowed"
                      : "bg-teal-600 hover:bg-teal-700")
                  }
                  disabled={submitting}
                  onClick={submit}
                >
                  {submitting ? "Đang xử lý..." : `Đặt hàng · ${formatMoneyVND(finalTotal)}`}
                </button>

                <div className="mt-4 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-teal-700" />
                    Thanh toán an toàn & bảo mật
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-teal-700" />
                    Giao hàng toàn quốc
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
