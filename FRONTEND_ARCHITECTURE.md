# Frontend Architecture - Hướng Dẫn Báo Cáo Thực Tập

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────┐
│                    Vite Dev Server (5173+)              │
│              (reload nhanh với HMR - Hot Module)        │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
    ┌─────────┐                  ┌──────────┐
    │  Pages  │                  │Components│
    │ (Routes)│                  │  (Reuse) │
    └────┬────┘                  └────┬─────┘
         │                            │
         └──────────────┬─────────────┘
                        ▼
        ┌──────────────────────────────────┐
        │    Component State (Hooks)       │
        │ - useState() for local state      │
        │ - useEffect() for side effects    │
        │ - useMemo() for optimization     │
        └──────────────┬───────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                            ▼
    ┌─────────────┐          ┌──────────────────┐
    │ App Context │          │ Zustand Stores   │
    │ (Thin)      │          │ (Global State)   │
    └─────────────┘          ├──────────────────┤
                             │ - auth.store     │
                             │ - cart.store     │
                             └────────┬─────────┘
                                      │
         ┌────────────────────────────┴────────────────────┐
         │                                                 │
         ▼                                                 ▼
    ┌───────────┐                                  ┌─────────────┐
    │localStorage│                                 │API (Axios)  │
    │(Persistent)│                                 │Backend 3000 │
    └───────────┘                                  └─────────────┘
```

**Stack công nghệ:**

- **Framework**: React 19 (functional components, hooks)
- **Build tool**: Vite 7 (faster dev, modern bundling)
- **Styling**: Tailwind CSS 4 + custom utilities
- **State Management**: Zustand (lightweight, Redux ko cần)
- **API Client**: Axios (interceptor cho auth)
- **Routing**: React Router v7 (nested routes)
- **Storage**: Zustand + localStorage (persist state)

---

## 2. Phân Tầng (Layering)

### 2.1 **Pages** (`src/pages/`)

Tương ứng 1-1 với routes, chứa business logic trang.

```
Pages/
├── HomePage.jsx              # Trang chủ - hiển thị featured products + testimonials
├── ProductsPage.jsx          # Danh sách sản phẩm với filter/sort
├── ProductDetailPage.jsx     # Chi tiết sản phẩm + reviews + similar
├── CartPage.jsx              # Giỏ hàng (xem, sửa qty, áp dụng mã)
├── CheckoutPage.jsx          # Thanh toán (địa chỉ, chọn payment method)
├── OrderSuccessPage.jsx      # Xác nhận đơn sau khi payment success
├── ProfilePage.jsx           # Hồ sơ người dùng + đơn hàng
├── LoginPage.jsx             # Đăng nhập (email + Google OAuth)
├── RegisterPage.jsx          # Đăng ký
└── admin/                    # Admin panel
    ├── AdminDashboard.jsx    # Trang chủ admin
    └── products/
        └── ProductsManagementPanel.jsx  # CRUD sản phẩm
```

**Đặc điểm:**

- Mỗi page là 1 `Router` component duy nhất
- Chứa logic fetch data, state management
- Gọi các components con để render UI

### 2.2 **Components** (`src/components/`)

Reusable UI components, không liên quan routes.

```
Components/
├── Header.jsx                # Navigation bar
├── Footer.jsx                # Footer
├── ProductCard.jsx           # Card sản phẩm (dùng ở home, search, detail)
├── ReviewModal.jsx           # Modal viết đánh giá
├── ImageLightbox.jsx         # Zoom ảnh sản phẩm
├── HomeFeaturedProductsSection.jsx
├── HomeTestimonialsSection.jsx
├── HeroCarousel.jsx          # Banner carousel
└── ...
```

**Đặc điểm:**

- Pure presentation logic
- Nhận dữ liệu qua `props`
- Emit events qua callback (e.g., `onAddToCart`)

### 2.3 **Stores** (`src/stores/`)

Zustand centralized state.

```
stores/
├── auth.store.js             # User + auth token
└── cart.store.js             # Cart items + discount
```

**Tại sao Zustand thay vì Redux?**

```
Zustand hơn Redux ở điểm:
✅ Code ít hơn (không cần reducer + actions + dispatch)
✅ TypeScript-friendly (dùng hooks trực tiếp)
✅ Persistent trực tiếp vào localStorage
✅ Middleware dễ dàng (logging, persist, etc)

Nhược điểm:
⚠️ Không có devtools như Redux
⚠️ Cộng động nhỏ hơn
```

### 2.4 **Services** (`src/services/`)

API calls (Axios).

```
services/
├── auth.api.js               # login, register, refreshSession
├── product.api.js            # listProducts, getProductById, getSimilar
├── order.api.js              # createOrder, listOrders, updateStatus
├── review.api.js             # createReview, listReviews
├── discountCode.api.js       # validateCode
└── ...
```

**Cấu trúc API call:**

```javascript
// Ví dụ: product.api.js
export const listProductsApi = async ({ page = 1, limit = 10, ...filters }) => {
  const res = await axios.get("/api/products", {
    params: { page, limit, ...filters },
  });
  return res?.data?.items || [];
};
```

---

## 3. Data Flow (Unidirectional)

### 3.1 Flow: Hiển Thị Sản Phẩm

```
HomePage
  │
  └─► useEffect(() => {
        listProductsApi().then(setItems)
      })
       │
       ▼
    Products state
       │
       ▼
  <ProductCard product={p} onAddToCart={...} />
       │
       ▼
  Render giá, tên, sao, button
```

### 3.2 Flow: Thêm Vào Giỏ

```
ProductCard
  │
  └─► onClick "Thêm vào giỏ"
       │
       ▼
  onAddToCart({ productId, qty })
       │
       ▼
  CartPage / useCartStore.addItem()
       │
       ▼
  localStorage ["cart-storage"] → {items: [...]}
       │
       ▼
  CartPage re-render (subscribe Zustand)
```

### 3.3 Flow: Thanh Toán

```
CheckoutPage
  │
  ├─► Validate địa chỉ, items
  │
  ├─► POST /api/orders/vnpay
  │        │
  │        ▼
  │     Backend tạo pending record
  │        │
  │        ▼
  │     Trả lại paymentUrl
  │
  └─► window.location.href = paymentUrl
         │
         ▼
      VNPay gateway
         │
         ▼
      Người dùng nhập OTP
         │
         ▼
      VNPay callback POST /api/orders/vnpay/return
         │
         ▼
      Backend tạo Order document
         │
         ▼
      Client redirect /order/success?result=success
```

---

## 4. State Management - Chi Tiết

### 4.1 Auth Store

```javascript
// stores/auth.store.js
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,              // { id, email, fullName, role, ... }
      accessToken: null,       // JWT token
      bootstrapped: false,     // Đã load từ localStorage chưa?

      setAuth({ user, accessToken }) { ... },
      clearAuth() { ... },
      bootstrap() {
        // Gọi /me endpoint để restore session
        // Dùng trong <AuthProvider>
      }
    }),
    {
      name: "auth",                         // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,                   // Chỉ lưu user, không lưu token (vì token ngắn hạn)
      }),
      onRehydrateStorage: () => (state) => {
        state?.setBootstrapped?.(false);    // Force refresh token khi page load
      },
    }
  )
);
```

**Tại sao `bootstrapped`?**

```
Page load: localStorage có { user: {...} } nhưng accessToken hết hạn
→ Cần gọi /me để lấy token mới (hay logout)
→ bootstrapped = false → bootstrap() → setBootstrapped(true)
→ App render khi bootstrapped = true (tránh flashing)
```

### 4.2 Cart Store

```javascript
// stores/cart.store.js
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],                    // [{ productId, qty, price, ... }]
      discount: null,               // { code, value, type }

      addItem(item) {
        // Nếu đã có → tăng qty
        // Nếu chưa → add mới
      },
      removeItem(productId) { ... },
      setQty(productId, nextQty) { ... },
      setDiscount(discount) { ... },
      clearCart() { ... }
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
```

**Persistent Logic:**

```
Zustand + persist middleware → localStorage tự động
→ Khi user reload page → items vẫn còn
→ Backend hoàn toàn NOT cần lưu cart (cart = client-side)
```

---

## 5. Components Chính & Tối Ưu

### 5.1 ProductCard - Layout Optimization

**Vấn đề cũ:**

```
Khi hover 1 card, card đó bị translate lên (-translate-y-0.5)
→ Nếu card cùng hàng có độ cao khác nhau
→ Nhìn có vẻ "nhích" hàng, không thẳng
```

**Giải pháp:**

```jsx
// Bỏ hover translate
className="group ... flex flex-col h-full"  // h-full = chiều cao đồng nhất
// Thêm auto-rows-fr ở grid parent
<div className="grid lg:grid-cols-4 gap-5 auto-rows-fr">
  {items.map(p => <ProductCard ... />)}
</div>
```

**Tại sao `auto-rows-fr`?**

```
auto-rows-fr = tất cả rows có height = 1 fraction (chiếm phần bằng nhau)
→ Nếu grid có 4 cols, 8 items → 2 rows, mỗi row height tính từ item cao nhất
→ Tất cả card trong 1 row có height = nhau
→ Hết bị lệch!
```

### 5.2 ProductCard - Display Fields

**Layout theo thứ tự:**

```
1. Tên sản phẩm (line-clamp-2)
2. Giá giảm (nếu có sale) + Giá gốc gạch (line-through)
3. Sao + Đã bán X

Lý do:
- Tên trên cùng → user đọc tên trước
- Giá ở giữa → quyết định mua
- Sao + đã bán dưới → review/proof
```

### 5.3 AI Product Advisor - Component Architecture

**File structure:**

```
src/
├── components/
│   └── AiAssistantWidget.jsx          # Chat UI (floating button)
├── services/
│   └── ai.api.js                      # POST /api/ai/chat
└── utils/
    └── aiChatUtils.js                 # Helper format, validation
```

**Flow:**

```
User nhập "ghế gỗ dưới 2 triệu"
  │
  ▼
AiAssistantWidget.jsx gửi lên backend
  │
  ▼
Backend (ai.controller.js):
  1. Parse constraints (category, material, price, rating)
  2. Multi-stage search (text, regex, price, rating, material)
  3. Gọi Groq LLM API để rank + reply
  4. Trả lại { reply, products: [...] }
  │
  ▼
AiAssistantWidget render reply + product cards
```

---

## 6. Performance Optimizations

### 6.1 Code Splitting

```javascript
// App.jsx
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));

// Vite tự động code split khi build
→ Landing page chỉ download HomePage JS, không download Admin JS
```

### 6.2 Component Memoization

```javascript
// ProductCard.jsx
const ProductCard = memo(({ product, showAddToCart, onAddToCart }) => {
  const ratingAvg = useMemo(() => clamp(Number(product?.ratingAvg || 0), 0, 5), [product]);
  // useMemo → không re-calculate nếu product không đổi

  return (...)
});
```

### 6.3 Image Optimization

```javascript
// ProductCard.jsx
<img
  src={imageUrl}
  alt={product?.name}
  loading="lazy" // Lazy load image (defer until visible)
  className="w-full h-full object-cover"
/>
```

### 6.4 API Request Debouncing

```javascript
// Header.jsx - autocomplete tìm kiếm
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

const debouncedSearch = debounce((q) => {
  listProductsApi({ search: q }).then(setSuggestions);
}, 300); // Chỉ gọi API sau 300ms không gõ
```

---

## 7. Error Handling & Validation

### 7.1 Form Validation

```javascript
// CheckoutPage.jsx
const validateCheckout = () => {
  if (!fullName) return "Tên không được để trống";
  if (!email || !isValidEmail(email)) return "Email không hợp lệ";
  if (!items.length) return "Giỏ hàng trống";
  // Return error message or null
};

if (validateCheckout()) {
  toast.error(validateCheckout());
  return;
}
```

### 7.2 API Error Handling

```javascript
// services/api
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Unauthorized → logout
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }
    throw err;
  },
);
```

---

## 8. Routing Structure

```
App.jsx (Routes)
├── / (HomePage)
├── /products (ProductsPage)
├── /products/:slug (ProductDetailPage)
├── /cart (CartPage)
├── /checkout (CheckoutPage)
├── /order/success (OrderSuccessPage)
├── /profile (ProfilePage)
│   ├── ?tab=info
│   ├── ?tab=orders
│   ├── ?tab=reviews
│   └── ?tab=address
├── /login (LoginPage)
├── /register (RegisterPage)
├── /forgot-password (ForgotPasswordPage)
├── /admin/dashboard (AdminDashboard)
│   ├── stats
│   ├── products
│   ├── users
│   ├── orders
│   └── discounts
```

**PrivateRoute Pattern:**

```javascript
// Middleware kiểm tra auth
const PrivateRoute = ({ element }) => {
  const { user } = useAuth();
  return user ? element : <Navigate to="/login" />;
};

// Dùng
<Route element={<PrivateRoute element={<CartPage />} />} path="/cart" />;
```

---

## 9. Package Dependencies - Lý Do Chọn

| Package              | Dùng Cho      | Tại Sao                                 |
| -------------------- | ------------- | --------------------------------------- |
| `react@19`           | UI library    | Stable, lớn cộng động, hooks mature     |
| `vite@7`             | Build tool    | Fast dev server, modern bundling        |
| `tailwindcss@4`      | Styling       | Utility-first, nhanh, mobile-first      |
| `zustand@5`          | State mgmt    | Lightweight, localStorage persist       |
| `axios@1.13`         | HTTP client   | Interceptor, request/response transform |
| `react-router-dom@7` | Routing       | Nested routes, loader/action            |
| `lucide-react`       | Icons         | Modern SVG icons, tree-shakeable        |
| `antd@6`             | UI components | Rich admin components (table, modal)    |

---

## 10. Security Considerations

### 10.1 XSS Prevention

```javascript
// ✅ Đúng - React tự escape HTML
<div>{userInput}</div>

// ❌ Sai - Cho phép HTML injection
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 10.2 CSRF Protection

```javascript
// Axios gửi token từ localStorage
// Backend kiểm tra CORS origin + cookie httpOnly
axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
```

### 10.3 Password Security

```javascript
// Frontend chỉ hash password trong register/forgot
// Backend: bcrypt hash lại, KHÔNG lưu plain password
import bcrypt from "bcrypt";
const hashed = await bcrypt.hash(password, 10);
```

---

## 11. Testing Strategy (Best Practices)

Mặc dù project không có unit tests, đây là strategies nên biết:

```javascript
// 1. Component Testing (React Testing Library)
test("ProductCard should display name", () => {
  render(<ProductCard product={mockProduct} />);
  expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
});

// 2. Store Testing (Zustand)
test("addItem should increase qty if same product", () => {
  const store = useCartStore.getState();
  store.addItem({ productId: "1", qty: 1 });
  store.addItem({ productId: "1", qty: 2 });
  expect(store.items[0].qty).toBe(3);
});

// 3. API Testing (Mock API)
test("listProducts should handle network error", async () => {
  jest.spyOn(axios, "get").mockRejectedValueOnce(new Error("Network"));
  await expect(listProductsApi()).rejects.toThrow("Network");
});
```

---

## 12. Build & Deployment

### 12.1 Development

```bash
npm run dev  # Vite dev server port 5173+
# HMR enabled → change file → auto-reload browser
```

### 12.2 Production Build

```bash
npm run build  # Output: dist/
# - Bundle JS (tree-shake, minify)
# - CSS extract + minify
# - Image optimize
# - Source maps (optional)

npm run preview  # Test build locally
```

### 12.3 Deployment (típico)

```bash
# 1. Build locally
npm run build

# 2. Upload dist/ lên server/CDN
# 3. Backend serve static files từ public/
# 4. Configure CORS

# OR sử dụng hosting (Vercel, Netlify)
# - Connect GitHub → auto-deploy trên commit
```

---

## 13. Common Issues & Solutions

| Issue                        | Nguyên Nhân              | Giải Pháp                                         |
| ---------------------------- | ------------------------ | ------------------------------------------------- |
| Cart items mất sau reload    | localStorage bị xóa      | Clear localStorage settings, check persist config |
| API call timeout             | Network chậm             | Thêm timeout interceptor, retry logic             |
| Ảnh không load               | Image URL sai            | Kiểm tra Cloudinary config, đảm bảo URL public    |
| Component re-render liên tục | Missing dependency array | Thêm dependency vào useEffect                     |
| Token hết hạn giữa request   | Token sinh từ JWT        | Gọi /me refresh mới, retry API                    |

---

## Tóm Tắt

**FE Architecture của project:**

1. **Vite** + **React 19** → fast development
2. **Zustand** → simple state (auth, cart)
3. **Tailwind CSS** → responsive UI
4. **Axios** → API calls với interceptor
5. **React Router** → routing/navigation
6. **Component-based** → reusable ProductCard, Header, etc

**Key Strengths:**
✅ Clean separation: Pages → Components → Stores → Services
✅ Optimization: memoization, lazy loading, debouncing
✅ State persistence: localStorage via Zustand
✅ Error handling: try-catch, API interceptor
✅ Security: token-based auth, CORS

**Area có thể improve:**
⚠️ Thêm unit tests (React Testing Library)
⚠️ Thêm E2E tests (Cypress/Playwright)
⚠️ TypeScript (type safety)
⚠️ Storybook (component documentation)
