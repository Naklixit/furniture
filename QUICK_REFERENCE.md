# Quick Reference - Ôn Tập Nhanh Trước Báo Cáo# Quick Reference - Ôn Tập Nhanh Trước Báo Cáo

**Good luck! You got this! 🚀**---5. **Engage audience** - "Có câu hỏi nào về chi tiết không?"4. **Show awareness** - "Future, nếu scale, nên add TypeScript" (maturity)3. **Admit unknowns** - "Không biết exactly, nhưng cá nhân mình sẽ..." (problem-solving)2. **Give examples** - "Ví dụ, ProductCard dùng ở 3 chỗ..." (visualization)1. **Speak confidently** - Bạn hiểu code, không cần assume## 🎤 Final Tips---đúng hạn + maintainability."Nếu deadline lỏng, sẽ add TypeScript + tests. Hiện tại, focus vào features "Đây là trade-off giữa quick execution (3 months) vs perfect code (6+ months). **Cách nói:**4. ⚠️ No error logging (Sentry) → Nhưng có try-catch error handling3. ⚠️ Simple JWT (no refresh token) → Nhưng secure enough cho project này2. ⚠️ No unit tests → Nhưng critical paths covered bằng manual testing1. ⚠️ No TypeScript → Nhưng có thể add sau## ⚠️ Weaknesses to Acknowledge (if asked)---6. ✅ **Real-world features**: Auth, payments, search, admin5. ✅ **Responsive**: Tailwind CSS, mobile-first4. ✅ **Security**: JWT token, CORS, signature verification3. ✅ **Performance**: Code splitting, lazy loading, memoization2. ✅ **State management**: Simple Zustand, dễ maintain1. ✅ **Clean architecture**: Pages → Components → Stores → Services## 💡 Strengths to Emphasize---`└── server.js│   ├── auth.js, upload.js ...├── middleware/│   ├── cloudinary.service.js, groq.service.js, payments/ ...├── services/│   ├── product.route.js, order.route.js ...├── routes/│   ├── Product.model.js, Order.model.js, User.model.js ...├── models/│   ├── product.controller.js, order.controller.js, auth.controller.js ...├── controllers/backend/src/    └── axios.js (API client setup)└── config/│   ├── format.js, validation.js ...├── utils/│   ├── product.api.js, order.api.js, auth.api.js ...├── services/│   ├── auth.store.js, cart.store.js├── stores/│   ├── ProductCard, Header, Footer, ReviewModal ...├── components/│   ├── HomePage, ProductsPage, CartPage, CheckoutPage, ProfilePage, admin/ ...├── pages/client/src/`## 📚 File Structure Nhanh---| Component re-render loop | Missing dependency | Add deps to useEffect array || Routing não work | Missing SPA fallback | Configure server: try_files $uri /index.html || Images not load | Wrong URL or CORS | Verify Cloudinary URL, check bucket permissions || API call 401 | Token invalid/expired | Check Authorization header, refresh token || Cart empty sau reload | localStorage clear | Check devtools > Application > Storage ||-------|-------|-----|| Issue | Cause | Fix |## 🐛 Common Issues & Fixes---`});  cy.url().should('include', '/order/success');  cy.get('button[type=submit]').click();  cy.get('input[name=fullName]').type('John');  cy.visit('/checkout');  cy.get('[data-testid=add-to-cart]').click();  cy.visit('/');it('should checkout successfully', () => {// E2E test Checkout (Cypress)});  expect(useCartStore().items).toHaveLength(1);  userEvent.click(screen.getByText('Add'));  render(<CartPage />);test('Add to cart increases item count', () => {// Integration test Cart});  expect(screen.getByText(mockProduct.name)).toBeInTheDocument();  render(<ProductCard product={mockProduct} />);test('ProductCard renders product name', () => {// Unit test ProductCard`javascript## 🧪 Testing Recommendations (nếu hỏi)---- [ ] Test localStorage persist (clear cache, reload)- [ ] Test page refresh (routing phải work)- [ ] Test API calls (dev tools network tab)- [ ] Setup backend CORS: `origin: 'https://yourdomain.com'`- [ ] Configure nginx/Apache (SPA fallback to index.html)- [ ] Upload dist/ to server- [ ] Set `VITE_API_URL` environment variable- [ ] `npm run build` → dist/## 🚀 Deployment Checklist---| Order | MongoDB | POST /api/orders/checkout || Products (catalog) | None (fetch on demand) | Every list/detail page || access token | Zustand memory (NOT localStorage, vì httpOnly better) | Login, refresh || User info (logged-in) | localStorage + Zustand | Bootstrap, login, refresh || Cart items | localStorage | Real-time (Zustand persist) ||------|------|-------------|| Data | Lưu ở | Sync khi nào |## 📊 Dữ Liệu Lưu Ở Đâu---- LLM: 🧠 Natural language understanding, rank products- Regex: ⚡ Fast, mà lại stateless (không cần training data)**Tại sao hybrid:**`  └─ Return: { reply: "...", products: [3 items] }  │  │  └─ Groq rank + write natural language reply  ├─ Stage 3: Send candidates + constraints to Groq LLM  │  │  └─ Dedupe + filter by constraints  │  ├─ Price-filtered search  │  ├─ Regex search (keywords)  │  ├─ Text search (MongoDB text index)  ├─ Stage 2: Multi-stage search  │  │  └─ category="ghe", material="go", maxPrice=2000000  ├─ Stage 1: Extract constraints (Regex)  │User input: "Ghế gỗ dưới 2 triệu"`## 🤖 AI Product Advisor Pipeline---`9. Clear cart: cartStore.clearCart()8. Frontend: Redirect /order/success?result=success   - Consume discount code   - Reduce inventory   - Create Order document   - Verify signature (tránh fake callback)7. Backend:6. VNPay callback: POST /api/orders/vnpay/return5. VNPay gateway: User nhập OTP/pin4. Frontend: window.location.href = paymentUrl   - Build payment URL (với signature HMAC)   - Create VnpayPending record   - Generate orderCode (unique)3. POST /api/orders/vnpay2. CheckoutPage: Validate address, items1. CartPage: items từ Zustand + localStorage`## 🛒 Order/Checkout Flow---`Frontend: không access/mange cookie, backend tự động gửiServer: Set-Cookie: sessionId=xxx; HttpOnly; SameSite=Strict`**httpOnly cookie (better practice):**`6. Token hết hạn: 401 → logout + redirect /login5. Subsequent API calls: Header Authorization: Bearer token4. Frontend: Save vào Zustand + localStorage3. Return: { user, accessToken }2. Backend: bcrypt hash + compare, generate JWT1. Login page → POST /api/auth/login (email, password)`## 🔐 Auth Flow---`- Bỏ hover:-translate-y-0.5: Không nhích, hết bị lệch- h-full flex flex-col: Flex layout, content căn bottom-left- auto-rows-fr: Grid tất cả card cùng height- aspect-[4/3]: Fixed ratio, hình không compress/stretch`**Optimization:**`4. Sao + "Đã bán X"3. Giá giảm + Giá gốc gạch2. Tên (line-clamp-2)1. Ảnh (aspect-[4/3], group-hover:scale-1.03)`**Layout:**## 🎨 ProductCard Optimization---- ✅ No dispatch/reducers (like Redux)- ✅ Persist via localStorage- ✅ Simple hook-based (gọi `useAuthStore()` → trigger re-render)**Key points:**`);  )    { name: "cart-storage", storage: localStorage }    }),      addItem, removeItem, setQty, setDiscount, clearCart      discount: null,      items: [],    (set) => ({  persist(const useCartStore = create(// cart.store.js - Similar pattern);  )    }      partialize: (state) => ({ user: state.user })  // Chỉ save user      storage: localStorage,      name: "auth",    {    }),      }        // set user/token from response        // GET /me refresh session      bootstrap: async () => {      clearAuth: () => set({ user: null, accessToken: null }),      setAuth: (user, token) => set({ user, accessToken: token }),      bootstrapped: false,      accessToken: null,      user: null,    (set, get) => ({  persist(const useAuthStore = create(// auth.store.js`javascript## 💾 Zustand Store Structure---Current architecture flexible, easy to refactor."**A:** "Add TypeScript, testing, React Query, GraphQL, Redux, Storybook. ### Q: Scale lên thì sao?TypeScript +3 days setup + 30% boilerplate. Nếu team lớn → yes."**A:** "Trade-off. Small project (1 person, 3 months) → JavaScript ok. ### Q: TypeScript tại sao không dùng?hoặc 2) Separate CDN (Vercel/Netlify). Backend cần allow CORS origin."**A:** "dist/ upload server. Either: 1) Backend serve static + SPA fallback, ### Q: Deploy sau build sao?Không auto-refresh (simple design), nếu muốn → cần refresh token pattern."**A:** "401 error → Axios interceptor logout + redirect /login. ### Q: Token hết hạn, user tự logout à?Hybrid approach: nhanh (regex) + flexible (LLM)."**A:** "Regex extract category/material/price → Groq LLM rank products. ### Q: AI Advisor hiểu constraints sao?Result: tất cả card cùng hàng cùng chiều cao. Không phải image."**A:** "2 bugs: 1) Hover translate lên → bỏ, 2) grid-auto-rows-fr (typo) → auto-rows-fr. ### Q: Card bị lệch lúc trước, fix như nào?Signature verify = security (tránh man-in-the-middle)."User pay → VNPay callback → Verify signature → Create Order. **A:** "Frontend → Backend create pending → Build VNPay URL → Redirect gateway → ### Q: VNPay flow là gì?Tiết kiệm API call, instant restore."**A:** "localStorage (client-side). Sync Backend chỉ khi checkout (validate giá, stock). ### Q: Cart lưu ở đâu?Sau khi update logic → tất cả nơi update tự động."**A:** "DRY principle. Dùng props `showAddToCart`, `className` để tùy chỉnh. ### Q: ProductCard dùng 3 chỗ, sao không tạo 3 component?Nếu project grow → dễ migrate, nhưng hiện tại Zustand đủ."**A:** "Redux too heavy cho project này (2 stores thôi). Zustand simple, 1kB vs 7kB. ### Q: Tại sao Zustand thay vì Redux?## 🔑 Những Câu Hỏi Quan Trọng Nhất (và cách trả lời nhanh)---`   └─ GEO (Nominatim)   ├─ AI (Groq LLM)   ├─ Payment (VNPay, MoMo)└─ Services│  └─ ...│  ├─ /api/ai/chat│  ├─ /api/orders│  ├─ /api/products├─ Routes│  ├─ Product,  Order, User, Review, ...├─ Models│  └─ ai.controller.js│  ├─ auth.controller.js│  ├─ order.controller.js│  ├─ product.controller.js├─ ControllersBackend (Express + MongoDB)   └─ ...   ├─ order.api.js   ├─ product.api.js└─ Services (APIs)│  └─ cart.store.js│  ├─ auth.store.js├─ Stores (Zustand)│  └─ ...│  ├─ Header│  ├─ ProductCard├─ Components (Reusable)│  └─ Admin dashboard│  ├─ CheckoutPage│  ├─ CartPage│  ├─ ProductsPage│  ├─ HomePage├─ Pages (Routes)Frontend (React 19 + Vite)`## 📐 Architecture Tóm Tắt---`Tính năng: Tìm kiếm sản phẩm, giỏ hàng, checkout (VNPay/MoMo), AI tư vấn, admin dashboard"Backend: Node/Express + MongoDBFrontend: React 19 + Vite + Tailwind CSS"Dự án là một nền tảng e-commerce nội thất (furniture shop).`## 🎯 30 Giây Giới Thiệu Dự Án

## 🎯 30 Giây Giới Thiệu Dự Án

```
"Dự án là một nền tảng e-commerce nội thất (furniture shop).
Frontend: React 19 + Vite + Tailwind CSS
Backend: Node/Express + MongoDB
Tính năng: Tìm kiếm sản phẩm, giỏ hàng, checkout (VNPay/MoMo), AI tư vấn, admin dashboard"
```

---

## 📐 Architecture Tóm Tắt

```
Frontend (React 19 + Vite)
├─ Pages (Routes)
│  ├─ HomePage
│  ├─ ProductsPage
│  ├─ CartPage
│  ├─ CheckoutPage
│  └─ Admin dashboard
├─ Components (Reusable)
│  ├─ ProductCard
│  ├─ Header
│  └─ ...
├─ Stores (Zustand)
│  ├─ auth.store.js
│  └─ cart.store.js
└─ Services (APIs)
   ├─ product.api.js
   ├─ order.api.js
   └─ ...

Backend (Express + MongoDB)
├─ Controllers
│  ├─ product.controller.js
│  ├─ order.controller.js
│  ├─ auth.controller.js
│  └─ ai.controller.js
├─ Models
│  ├─ Product,  Order, User, Review, ...
├─ Routes
│  ├─ /api/products
│  ├─ /api/orders
│  ├─ /api/ai/chat
│  └─ ...
└─ Services
   ├─ Payment (VNPay, MoMo)
   ├─ AI (Groq LLM)
   └─ GEO (Nominatim)
```

---

## 🔑 Những Câu Hỏi Quan Trọng Nhất (và cách trả lời nhanh)

### Q: Tại sao Zustand thay vì Redux?

**A:** "Redux too heavy cho project này (2 stores thôi). Zustand simple, 1kB vs 7kB.
Nếu project grow → dễ migrate, nhưng hiện tại Zustand đủ."

### Q: ProductCard dùng 3 chỗ, sao không tạo 3 component?

**A:** "DRY principle. Dùng props `showAddToCart`, `className` để tùy chỉnh.
Sau khi update logic → tất cả nơi update tự động."

### Q: Cart lưu ở đâu?

**A:** "localStorage (client-side). Sync Backend chỉ khi checkout (validate giá, stock).
Tiết kiệm API call, instant restore."

### Q: VNPay flow là gì?

**A:** "Frontend → Backend create pending → Build VNPay URL → Redirect gateway →
User pay → VNPay callback → Verify signature → Create Order.
Signature verify = security (tránh man-in-the-middle)."

### Q: Card bị lệch lúc trước, fix như nào?

**A:** "2 bugs: 1) Hover translate lên → bỏ, 2) grid-auto-rows-fr (typo) → auto-rows-fr.
Result: tất cả card cùng hàng cùng chiều cao. Không phải image."

### Q: AI Advisor hiểu constraints sao?

**A:** "Regex extract category/material/price → Groq LLM rank products.
Hybrid approach: nhanh (regex) + flexible (LLM)."

### Q: Token hết hạn, user tự logout à?

**A:** "401 error → Axios interceptor logout + redirect /login.
Không auto-refresh (simple design), nếu muốn → cần refresh token pattern."

### Q: Deploy sau build sao?

**A:** "dist/ upload server. Either: 1) Backend serve static + SPA fallback,
hoặc 2) Separate CDN (Vercel/Netlify). Backend cần allow CORS origin."

### Q: TypeScript tại sao không dùng?

**A:** "Trade-off. Small project (1 person, 3 months) → JavaScript ok.
TypeScript +3 days setup + 30% boilerplate. Nếu team lớn → yes."

### Q: Scale lên thì sao?

**A:** "Add TypeScript, testing, React Query, GraphQL, Redux, Storybook.
Current architecture flexible, easy to refactor."

---

## 💾 Zustand Store Structure

```javascript
// auth.store.js
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      bootstrapped: false,
      setAuth: (user, token) => set({ user, accessToken: token }),
      clearAuth: () => set({ user: null, accessToken: null }),
      bootstrap: async () => {
        // GET /me refresh session
        // set user/token from response
      },
    }),
    {
      name: "auth",
      storage: localStorage,
      partialize: (state) => ({ user: state.user }), // Chỉ save user
    },
  ),
);

// cart.store.js - Similar pattern
const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      discount: null,
      addItem,
      removeItem,
      setQty,
      setDiscount,
      clearCart,
    }),
    { name: "cart-storage", storage: localStorage },
  ),
);
```

**Key points:**

- ✅ Simple hook-based (gọi `useAuthStore()` → trigger re-render)
- ✅ Persist via localStorage
- ✅ No dispatch/reducers (like Redux)

---

## 🎨 ProductCard Optimization

**Layout:**

```
1. Ảnh (aspect-[4/3], group-hover:scale-1.03)
2. Tên (line-clamp-2)
3. Giá giảm + Giá gốc gạch
4. Sao + "Đã bán X"
```

**Optimization:**

```
- aspect-[4/3]: Fixed ratio, hình không compress/stretch
- auto-rows-fr: Grid tất cả card cùng height
- h-full flex flex-col: Flex layout, content căn bottom-left
- Bỏ hover:-translate-y-0.5: Không nhích, hết bị lệch
```

---

## 🔐 Auth Flow

```
1. Login page → POST /api/auth/login (email, password)
2. Backend: bcrypt hash + compare, generate JWT
3. Return: { user, accessToken }
4. Frontend: Save vào Zustand + localStorage
5. Subsequent API calls: Header Authorization: Bearer token
6. Token hết hạn: 401 → logout + redirect /login
```

**httpOnly cookie (better practice):**

```
Server: Set-Cookie: sessionId=xxx; HttpOnly; SameSite=Strict
Frontend: không access/mange cookie, backend tự động gửi
```

---

## 🛒 Order/Checkout Flow

```
1. CartPage: items từ Zustand + localStorage
2. CheckoutPage: Validate address, items
3. POST /api/orders/vnpay
   - Generate orderCode (unique)
   - Create VnpayPending record
   - Build payment URL (với signature HMAC)
4. Frontend: window.location.href = paymentUrl
5. VNPay gateway: User nhập OTP/pin
6. VNPay callback: POST /api/orders/vnpay/return
7. Backend:
   - Verify signature (tránh fake callback)
   - Create Order document
   - Reduce inventory
   - Consume discount code
8. Frontend: Redirect /order/success?result=success
9. Clear cart: cartStore.clearCart()
```

---

## 🤖 AI Product Advisor Pipeline

```
User input: "Ghế gỗ dưới 2 triệu"
  │
  ├─ Stage 1: Extract constraints (Regex)
  │  └─ category="ghe", material="go", maxPrice=2000000
  │
  ├─ Stage 2: Multi-stage search
  │  ├─ Text search (MongoDB text index)
  │  ├─ Regex search (keywords)
  │  ├─ Price-filtered search
  │  └─ Dedupe + filter by constraints
  │
  ├─ Stage 3: Send candidates + constraints to Groq LLM
  │  └─ Groq rank + write natural language reply
  │
  └─ Return: { reply: "...", products: [3 items] }
```

**Tại sao hybrid:**

- Regex: ⚡ Fast, mà lại stateless (không cần training data)
- LLM: 🧠 Natural language understanding, rank products

---

## 📊 Dữ Liệu Lưu Ở Đâu

| Data                  | Lưu ở                                                 | Sync khi nào                |
| --------------------- | ----------------------------------------------------- | --------------------------- |
| Cart items            | localStorage                                          | Real-time (Zustand persist) |
| User info (logged-in) | localStorage + Zustand                                | Bootstrap, login, refresh   |
| access token          | Zustand memory (NOT localStorage, vì httpOnly better) | Login, refresh              |
| Products (catalog)    | None (fetch on demand)                                | Every list/detail page      |
| Order                 | MongoDB                                               | POST /api/orders/checkout   |

---

## 🚀 Deployment Checklist

- [ ] `npm run build` → dist/
- [ ] Set `VITE_API_URL` environment variable
- [ ] Upload dist/ to server
- [ ] Configure nginx/Apache (SPA fallback to index.html)
- [ ] Setup backend CORS: `origin: 'https://yourdomain.com'`
- [ ] Test API calls (dev tools network tab)
- [ ] Test page refresh (routing phải work)
- [ ] Test localStorage persist (clear cache, reload)

---

## 🧪 Testing Recommendations (nếu hỏi)

```javascript
// Unit test ProductCard
test("ProductCard renders product name", () => {
  render(<ProductCard product={mockProduct} />);
  expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
});

// Integration test Cart
test("Add to cart increases item count", () => {
  render(<CartPage />);
  userEvent.click(screen.getByText("Add"));
  expect(useCartStore().items).toHaveLength(1);
});

// E2E test Checkout (Cypress)
it("should checkout successfully", () => {
  cy.visit("/");
  cy.get("[data-testid=add-to-cart]").click();
  cy.visit("/checkout");
  cy.get("input[name=fullName]").type("John");
  cy.get("button[type=submit]").click();
  cy.url().should("include", "/order/success");
});
```

---

## 🐛 Common Issues & Fixes

| Issue                    | Cause                 | Fix                                             |
| ------------------------ | --------------------- | ----------------------------------------------- |
| Cart empty sau reload    | localStorage clear    | Check devtools > Application > Storage          |
| API call 401             | Token invalid/expired | Check Authorization header, refresh token       |
| Images not load          | Wrong URL or CORS     | Verify Cloudinary URL, check bucket permissions |
| Routing não work         | Missing SPA fallback  | Configure server: try_files $uri /index.html    |
| Component re-render loop | Missing dependency    | Add deps to useEffect array                     |

---

## 📚 File Structure Nhanh

```
client/src/
├── pages/
│   ├── HomePage, ProductsPage, CartPage, CheckoutPage, ProfilePage, admin/ ...
├── components/
│   ├── ProductCard, Header, Footer, ReviewModal ...
├── stores/
│   ├── auth.store.js, cart.store.js
├── services/
│   ├── product.api.js, order.api.js, auth.api.js ...
├── utils/
│   ├── format.js, validation.js ...
└── config/
    └── axios.js (API client setup)

backend/src/
├── controllers/
│   ├── product.controller.js, order.controller.js, auth.controller.js ...
├── models/
│   ├── Product.model.js, Order.model.js, User.model.js ...
├── routes/
│   ├── product.route.js, order.route.js ...
├── services/
│   ├── cloudinary.service.js, groq.service.js, payments/ ...
├── middleware/
│   ├── auth.js, upload.js ...
└── server.js
```

---

## 💡 Strengths to Emphasize

1. ✅ **Clean architecture**: Pages → Components → Stores → Services
2. ✅ **State management**: Simple Zustand, dễ maintain
3. ✅ **Performance**: Code splitting, lazy loading, memoization
4. ✅ **Security**: JWT token, CORS, signature verification
5. ✅ **Responsive**: Tailwind CSS, mobile-first
6. ✅ **Real-world features**: Auth, payments, search, admin

---

## ⚠️ Weaknesses to Acknowledge (if asked)

1. ⚠️ No TypeScript → Nhưng có thể add sau
2. ⚠️ No unit tests → Nhưng critical paths covered bằng manual testing
3. ⚠️ Simple JWT (no refresh token) → Nhưng secure enough cho project này
4. ⚠️ No error logging (Sentry) → Nhưng có try-catch error handling

**Cách nói:**
"Đây là trade-off giữa quick execution (3 months) vs perfect code (6+ months).
Nếu deadline lỏng, sẽ add TypeScript + tests. Hiện tại, focus vào features
đúng hạn + maintainability."

---

## 🎤 Final Tips

1. **Speak confidently** - Bạn hiểu code, không cần assume
2. **Give examples** - "Ví dụ, ProductCard dùng ở 3 chỗ..." (visualization)
3. **Admit unknowns** - "Không biết exactly, nhưng cá nhân mình sẽ..." (problem-solving)
4. **Show awareness** - "Future, nếu scale, nên add TypeScript" (maturity)
5. **Engage audience** - "Có câu hỏi nào về chi tiết không?"

---

**Good luck! You got this! 🚀**
