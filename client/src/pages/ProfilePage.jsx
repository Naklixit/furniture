import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { UserRound, Package, LogOut, Pencil, Save, X } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { logoutApi } from "../services/auth.api";
import { updateMeApi } from "../services/user.api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthed, accessToken, logout, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "profile").toLowerCase();

  const [isEditing, setIsEditing] = useState(false);
  const [didLogout, setDidLogout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const fullName = user?.fullName || "";
  const email = user?.email || "";
  const phoneNumber = user?.phoneNumber || "";
  const address = user?.address || "";

  const [draftPhone, setDraftPhone] = useState(phoneNumber);
  const [draftAddress, setDraftAddress] = useState(address);

  const activeTab = useMemo(() => (tab === "orders" ? "orders" : "profile"), [tab]);

  if (didLogout) return <Navigate to="/" replace />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/dashboard" replace />;

  const setTab = (nextTab) => {
    setIsEditing(false);
    setSaveError("");
    setSaveOk("");
    setSearchParams({ tab: nextTab });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaveError("");
    setSaveOk("");

    try {
      setSaving(true);
      const res = await updateMeApi({
        phoneNumber: (draftPhone || "").trim(),
        address: draftAddress || "",
      });

      const nextUser = res?.user;
      if (nextUser) {
        login({ user: nextUser, accessToken });
      }

      setIsEditing(false);
      setSaveOk("Đã lưu thông tin.");
    } catch (err) {
      setSaveError(err?.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setDidLogout(true);
    try {
      await logoutApi();
    } catch {
      // Bỏ qua lỗi
    } finally {
      logout();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-scroll">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Thanh bên */}
          <aside className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="text-lg font-semibold text-gray-900">Tài khoản của tôi</div>
            </div>

            <div className="p-3 space-y-1">
              <button
                type="button"
                onClick={() => setTab("profile")}
                className={
                  "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition text-left " +
                  (activeTab === "profile"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50")
                }
              >
                <UserRound size={18} className={activeTab === "profile" ? "text-blue-600" : "text-gray-600"} />
                <span className="font-medium">Thông tin cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("orders")}
                className={
                  "w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition text-left " +
                  (activeTab === "orders"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50")
                }
              >
                <Package size={18} className={activeTab === "orders" ? "text-blue-600" : "text-gray-600"} />
                <span className="font-medium">Quản lý đơn hàng</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm text-gray-700 hover:bg-red-50 transition text-left"
              >
                <LogOut size={18} className="text-gray-600" />
                <span className="font-medium">Đăng xuất</span>
              </button>
            </div>
          </aside>

          {/* Nội dung */}
          <section className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-[560px]">
            {activeTab === "profile" ? (
              <>
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-base font-semibold text-gray-900">Thông tin cá nhân</div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftPhone(phoneNumber);
                        setDraftAddress(address);
                        setIsEditing(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
                    >
                      <Pencil size={16} />
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={
                          "inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-semibold shadow-sm transition " +
                          (saving
                            ? "bg-blue-600/60 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700")
                        }
                      >
                        <Save size={16} />
                        {saving ? "Đang lưu..." : "Lưu"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftPhone(phoneNumber);
                          setDraftAddress(address);
                          setSaveError("");
                          setSaveOk("");
                          setIsEditing(false);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold"
                      >
                        <X size={16} />
                        Hủy
                      </button>
                    </div>
                  )}
                </div>

                {saveError || saveOk ? (
                  <div
                    className={
                      "px-6 py-3 text-sm border-b " +
                      (saveError
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "bg-green-50 text-green-700 border-green-100")
                    }
                  >
                    {saveError || saveOk}
                  </div>
                ) : null}

                <div className="p-6">
                  <div className="flex items-start gap-8">
                    <div className="shrink-0">
                      <div className="w-28 h-28 rounded-full bg-blue-600/90 flex items-center justify-center">
                        <UserRound size={44} className="text-white" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="space-y-5">
                        <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-gray-100 pb-4">
                          <div className="text-sm font-semibold text-gray-700">Họ tên:</div>
                          <div className="text-sm text-gray-900">{fullName}</div>
                        </div>

                        <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-gray-100 pb-4">
                          <div className="text-sm font-semibold text-gray-700">Email:</div>
                          <div className="text-sm text-gray-900">{email}</div>
                        </div>

                        <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-gray-100 pb-4">
                          <div className="text-sm font-semibold text-gray-700">Số điện thoại:</div>
                          <div className="text-sm text-gray-900">
                            {isEditing ? (
                              <input
                                value={draftPhone}
                                onChange={(e) => {
                                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 10);
                                  setDraftPhone(digits);
                                }}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                className="w-full max-w-md px-3 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Nhập số điện thoại"
                              />
                            ) : (
                              phoneNumber
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-[140px_1fr] items-start gap-4 border-b border-gray-100 pb-4">
                          <div className="text-sm font-semibold text-gray-700 pt-2">Địa chỉ:</div>
                          <div className="text-sm text-gray-900">
                            {isEditing ? (
                              <textarea
                                value={draftAddress}
                                onChange={(e) => setDraftAddress(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Nhập địa chỉ"
                              />
                            ) : (
                              <div className="whitespace-pre-line">{address}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-4 text-xs text-gray-500">
                          Bạn có thể cập nhật số điện thoại và địa chỉ.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="text-base font-semibold text-gray-900">Đơn hàng của tôi</div>
                </div>
                <div className="p-6">
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                    <div className="text-sm font-semibold text-gray-900">Chưa có đơn hàng</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Khi bạn đặt hàng, danh sách đơn hàng sẽ hiển thị ở đây.
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
