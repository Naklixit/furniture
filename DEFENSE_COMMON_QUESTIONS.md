# Frontend Defense Guide - Những Câu Hỏi Hay Bị Hỏi + Cách Trả Lời

## Q1: Tại sao chọn Zustand thay vì Redux?

### Câu hỏi Full:
*"Redux là state management library phổ biến nhất. Tại sao bạn chọn Zustand? Redux có gì hơn?"*

### Cách Trả Lời:

**Redux:**
```javascript
// Action
const loginAction = (user) => ({ type: 'LOGIN', payload: user });

// Reducer
const authReducer = (state = { user: null }, action) => {
  switch(action.type) {
    case 'LOGIN': return { ...state, user: action.payload };
    default: return state;
  }
};

// Dispatch
dispatch(loginAction(user));
```

**Zustand:**
```javascript
const useAuthStore = create((set) => ({
  user: null,
  setAuth: (user) => set({ user }),
  login: (user) => set({ user })
}));

// Usage: gọi trực tiếp thôi
useAuthStore.getState().setAuth(user);
```

**So sánh:**

| Tiêu chí | Redux | Zustand |
|----------|-------|---------|
| Lines of code | ~30-50 | ~10-15 |
| Learning curve | Steep (actions, reducers, dispatch) | Flat (direct function call) |
| TypeScript | Cần setup type inference | Native TypeScript-friendly |
| DevTools | Redux DevTools (powerful) | Không có (nhưng có logging middleware) |
| Persistence | Cần extra lib (@redux-persist) | Built-in persist middleware |
| Bundle size | ~7kB gzip | ~1kB gzip |

**Kết luận:**
```
Dự án này scale nhỏ-vừa (2 stores: auth, cart)
→ Redux quá heavy, overkill
→ Zustand đủ simple, nhẹ, dễ maintain
→ Nếu sau này project grow → dễ migrate

Câu hỏi follow-up thường hỏi:
"Nếu project lớn hơn sao?" → Trả lời: "Có thể migrate sang Redux, 
hoặc chia store nhỏ hơn + dùng context composition"
```

---

## Q2: Làm sao ProductCard có thể dùng ở 3 chỗ khác nhau (Home, Products, Detail)?

### Câu hỏi Full:
*"ProductCard dùng ở HomePage, ProductsPage, và ProductDetailPage (similar products). 
Sao không tạo 3 component khác nhau? Làm sao handle tất cả case?"*

### Cách Trả Lời:

**Props-based flexibility:**
```javascript
// ProductCard.jsx
const ProductCard = ({ 
  product, 
  showAddToCart = true,        // Show/hide "Add to cart" button
  onAddToCart,                  // Custom handler (if needed)
  className = ""                // Custom styling
}) => {
  // Render chung UI, nhưng có tùy chỉnh
  return (
    <div className={`card ${className}`}>
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      
      {showAddToCart ? (
        <button onClick={handleAdd}>
          Thêm vào giỏ
        </button>
      ) : null}
    </div>
  );
};
```

**Cách dùng ở 3 nơi:**

```javascript
// 1. HomePage - show "Add to cart"
<ProductCard product={p} showAddToCart={true} />

// 2. ProductsPage - show "Add to cart"
<ProductCard product={p} showAddToCart={true} />

// 3. ProductDetailPage (similar) - không show button (vì đã có button ở detail section)
<ProductCard product={p} showAddToCart={false} />
```

**Nếu cần custom styling:**
```javascript
// Home: card nhỏ hơn
<ProductCard product={p} className="max-w-xs" />

// Products: card full width
<ProductCard product={p} className="w-full" />
```

**Why DRY (Don't Repeat Yourself)?**
```
Nếu tạo 3 component:
- ProductCardHome.jsx
- ProductCardProduct.jsx
- ProductCardDetail.jsx

→ Khi update logic (e.g., thêm "đã bán"), phải sửa 3 chỗ
→ Bug dễ xảy ra (quên update 1 chỗ)

Với 1 component + props:
→ Sửa 1 chỗ → tất cả nơi update
→ Dễ maintain
```

---

## Q3: Cart được lưu ở đâu? Frontend hay Backend?

### Câu hỏi Full:
*"Tôi add sản phẩm vào giỏ. Sau đó shutdown browser. Khi mở lại, giỏ vẫn còn. 
Dữ liệu được lưu ở database Backend hay localStorage?"*

### Cách Trả Lời:

**Answer: localStorage (Frontend)**

```javascript
// stores/cart.store.js
export const useCartStore = create(
  persist(  // ← Zustand persist middleware
    (set) => ({
      items: [],
      addItem: (item) => { /* ... */ }
    }),
    {
      name: "cart-storage",  // localStorage key
      storage: createJSONStorage(() => localStorage)
    }
  )
);
```

**Flow:**
```
1. User click "Add to cart"
   ↓
2. addItem() được gọi (Zustand action)
   ↓
3. Zustand persist middleware tự động save vào localStorage
   ↓
4. localStorage["cart-storage"] = JSON stringify items
   ↓
5. User close tab/browser
   ↓
6. User open lại website
   ↓
7. Zustand hydrate từ localStorage (tự động)
   ↓
8. Cart items hiện lại (giồng ơi!)
```

**localStorage JSON:**
```json
{
  "state": {
    "items": [
      { "productId": "123", "qty": 2, "price": 1500000, "name": "Ghế gỗ" }
    ],
    "discount": null
  },
  "version": 0
}
```

**Tại sao không lưu Backend?**

| Lưu Backend | Lưu Frontend (localStorage) |
|-------------|---------------------------|
| ❌ Cần login để restore cart | ✅ Restore tự động, không cần login |
| ❌ API call mỗi lần load page | ✅ Instant load từ browser |
| ❌ Server tải cao | ✅ Giảm tải server |
| ✅ Share cart across devices | ❌ Cart per device |

**Khi nào sync Backend?**
```
Chỉ khi checkout:
1. Frontend POST /api/orders với items từ localStorage
2. Backend validate (kiểm tra stock, giá)
3. Backend tạo Order document
4. Frontend clear cart
```

**Follow-up câu hỏi:**
"Nếu user edit localStorage, thay đổi price sao?"
→ "Backend validate lại price khi checkout, không tin frontend"

---

## Q4: Giải thích flow thanh toán (VNPay) từ đầu đến cuối

### Câu hỏi Full:
*"User click 'Thanh toán VNPay'. Sau đó gì xảy ra? Dữ liệu flow như nào? 
Backend + Frontend có làm gì?"*

### Cách Trả Lời:

**Sơ đồ Flow:**

```
Frontend (CheckoutPage)
  ↓ (1) POST /api/orders/vnpay
  │ gửi: { items, address, fullName, email }
  │
  ├─────────────────────────────────────────→ Backend
  │                                            ↓
  │                                          (2) Validate order
  │                                            - Check user login
  │                                            - Check items exist + stock
  │                                            - Check discount valid
  │                                            ↓
  │                                          (3) Create VnpayPending record
  │                                            - Save order info (tạm)
  │                                            - Generate txnRef (unique)
  │                                            ↓
  │                                          (4) Build VNPay payment URL
  │                                            - Signature HMAC SHA512
  │                                            - Amount, OrderInfo, ReturnUrl
  │                                            ↓
  │                ←─────────────────────────←
  │          (5) Return paymentUrl
  │             { success: true, paymentUrl: "..." }
  │
  ↓ (6) window.location.href = paymentUrl
  │ Browser redirect VNPay gateway
  │
  ├─────────────────────────────────────────→ VNPay Gateway (External)
  │                                            ↓
  │                                          (7) User nhập OTP/pin
  │                                            Xác thực giao dịch
  │                                            ↓
  │                                          (8) VNPay xác nhận thành công
  │                                            (hoặc failed)
  │                                            ↓
  └──────────────────────────────────────────(9) Redirect về app
                                                return URL
                                                ?vnp_TransactionStatus=00
                                                (00 = success)
  ↓ (10) CheckoutPage nhận ?vnp_*=... query params
  │
  └─ POST /api/orders/vnpay/return
     gửi: { query params }
     ↓
     Backend:
     (11) Verify VNPay signature
          - Rebuild HMAC từ params
          - So sánh với vnp_SecureHash
          → Tránh man-in-the-middle attack
          ↓
     (12) Nếu signature OK + status = 00:
          - Tạo Order document từ VnpayPending
          - Set payment.status = "paid"
          - Reduce inventory
          - Consume discount code (nếu có)
          ↓
     (13) Return redirect URL
          /order/success?result=success&orderId=xxx
     ↓
  Redirect UI:
  (14) Display "Thanh toán thành công!" + Order details
```

**Code sequence:**

```javascript
// Frontend - CheckoutPage.jsx
const handleSubmit = async () => {
  const res = await createVnpayPaymentApi({
    items: cartItems,
    address,
    fullName,
    discountCode
  });
  // res = { paymentUrl: "https://sandbox.vnpayment.vn/..." }
  
  window.location.href = res.paymentUrl;
  // Redirect VNPay gateway
};

// VNPay -> ReturnUrl -> /api/orders/vnpay/return?vnp_TransactionStatus=00&...
// Backend verify signature + create Order
// Then: window.location = /order/success?result=success&orderId=XXX

// Frontend - OrderSuccessPage
useEffect(() => {
  const result = new URLSearchParams(location.search).get('result');
  if (result === 'success') {
    // OK, show "Đơn hàng được tạo" + clear localStorage
    cartStore.clearCart();
  }
}, [location.search]);
```

**Tại sao cần VnpayPending record?**
```
Scenario: User checkout → Create pending → Payment fail → User retry

VnpayPending:
- id: "pending-123"
- status: "pending" → "paid" (sau khi VNPay verify)
- items: [...]
- total: 5000000

Tại sao cần? 
→ Tránh create 2 Order khi user click "Back" + retry
→ Pending record = "intent to pay", Order document = "payment confirmed"
→ Kiểm tra duplicate: if Order with txnRef already exists → không create lại
```

**Security:**
```
1. HMAC Signature verify:
   - VNPay gửi: data + vnp_SecureHash
   - Backend rebuild: HMAC(secret_key, data)
   - So sánh: hash === vnp_SecureHash
   → Tránh giả mạo request

2. Amount verify:
   - VNPay trả vnp_Amount
   - Backend check: vnp_Amount === expected_amount
   → Tránh downgrade price

3. HTTPS only:
   - Return URL phải HTTPS (not HTTP)
   → Tránh man-in-the-middle
```

---

## Q5: AI Product Advisor - Làm sao nó "hiểu" constraints từ user input?

### Câu hỏi Full:
*"User gõ 'Ghế gỗ dưới 2 triệu'. Sao backend biết đó là category=Chair, material=Wood, maxPrice=2M? 
Có dùng NLP/ML không? Hay regex pattern matching?"*

### Cách Trả Lời:

**Answer: Hybrid approach (Regex + Groq LLM)**

**Stage 1: Constraint Extraction (Backend)**

```javascript
// backend/src/utils/aiChatUtils.js

const extractConstraints = (userInput) => {
  const constraints = {
    categoryTokens: [],      // ["ghe", "sofa", ...]
    materialTokens: [],       // ["go", "da", "vai", ...]
    minPrice: null,
    maxPrice: null,
    minRating: null,
    hasMaterialConstraint: false,
    hasPriceConstraint: false
  };

  const text = normalizeText(userInput);
  
  // 1. Extract Category (regex pattern matching)
  const categoryKeywords = {
    'ghe|chair|armchair': 'ghe',
    'sofa|xô pha|ghế sofa': 'sofa',
    'bàn|table|ban': 'ban',
    'giường|bed': 'giuong',
    'đèn|lamp|light': 'den',
    'tủ|cabinet|tu': 'tu'
  };
  
  for (const [pattern, token] of Object.entries(categoryKeywords)) {
    if (new RegExp(pattern, 'i').test(text)) {
      constraints.categoryTokens.push(token);
    }
  }
  
  // 2. Extract Material
  const materialKeywords = {
    'gỗ|wood|wooden': 'go',
    'da|leather': 'da',
    'vải|fabric': 'vai',
    'kim loại|metal|sắt|inox': 'kimloai',
    'nhựa|plastic': 'nhua'
  };
  
  if (Object.keys(materialKeywords).some(pattern => 
    new RegExp(pattern, 'i').test(text)
  )) {
    constraints.hasMaterialConstraint = true;
  }
  
  // 3. Extract Price (Regex for "từ X đến Y")
  const pricePattern = /từ\s*([\d.kmتriệu]+)\s*đến\s*([\d.kmتriệu]+)|dưới\s*([\d.kmتriệu]+)|từ\s*([\d.kmتriệu]+)\s*trở lên/i;
  const match = text.match(pricePattern);
  
  if (match) {
    if (match[1] && match[2]) {  // "từ X đến Y"
      constraints.minPrice = parsePrice(match[1]);
      constraints.maxPrice = parsePrice(match[2]);
    } else if (match[3]) {  // "dưới X"
      constraints.maxPrice = parsePrice(match[3]);
    } else if (match[4]) {  // "từ X trở lên"
      constraints.minPrice = parsePrice(match[4]);
    }
    constraints.hasPriceConstraint = true;
  }
  
  // 4. Extract Rating
  const ratingPattern = /(\d+\.?\d*)\s*sao|sao (cao|cao nhất|tốt)/i;
  const ratingMatch = text.match(ratingPattern);
  if (ratingMatch) {
    constraints.minRating = Number(ratingMatch[1]) || 4;
  }
  
  return constraints;
};

const parsePrice = (str) => {
  // "2 triệu" → 2000000
  // "500k" → 500000
  // "1.5 tr" → 1500000
  
  const num = parseFloat(str);
  if (str.match(/triệu|tr|m/i)) return num * 1000000;
  if (str.match(/k|nghìn|ngàn/i)) return num * 1000;
  return num;
};
```

**Stage 2: Query Building (Multi-stage Search)**

```javascript
// Sau khi có constraints, backend search:

// 1. TEXT SEARCH - tìm từ khóa trong description
const textHits = await Product.find({
  isActive: true,
  $text: { $search: userInput }
}).limit(20);

// 2. REGEX SEARCH - tìm các keyword rút ra
const regexHits = [];
for (const keyword of keywords) {
  const results = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { slug: { $regex: keyword, $options: 'i' } },
      { 'specs.material': { $regex: keyword, $options: 'i' } }
    ]
  }).limit(10);
  regexHits.push(...results);
}

// 3. CONSTRAINT FILTER - lọc theo constraints
let filtered = [...textHits, ...regexHits];

if (constraints.categoryTokens.length) {
  filtered = filtered.filter(p => 
    constraints.categoryTokens.some(cat => p.category?.token === cat)
  );
}

if (constraints.hasPriceConstraint) {
  filtered = filtered.filter(p => {
    const price = p.effectivePrice || p.salePrice || p.originalPrice;
    if (constraints.minPrice && price < constraints.minPrice) return false;
    if (constraints.maxPrice && price > constraints.maxPrice) return false;
    return true;
  });
}

// Kết quả: 3 sản phẩm tốt nhất
const candidates = dedupByProductId(filtered).slice(0, 3);
```

**Stage 3: LLM Ranking (Groq API)**

```javascript
// Gửi candidates + constraints lên Groq để rank + write reply

const prompt = `
Sản phẩm gợi ý cho user:
${candidates.map(p => `- ${p.name}: ${p.price}đ, ${p.ratingAvg}⭐`).join('\n')}

User muốn: ${userInput}

Xếp hạng: chọn 3 sản phẩm tốt nhất + viết lời giới thiệu tự nhiên (không máy móc)
`;

const { reply, productIndexes } = await callGroqAPI(prompt);
// Groq returns: "Ghế gỗ tuyết tùng rất tốt vì..." + [0, 1, 2]
```

**Tại sao không dùng ML Model?**

| Approach | Ưu điểm | Nhược điểm |
|----------|---------|-----------|
| **Regex** | ✅ Nhanh, xác định | ❌ Cứng nhắc (miss ngôn ngữ tự nhiên) |
| **ML Model** | ✅ Flexible, learn patterns | ❌ Cần training data, inference slow |
| **Hybrid** | ✅ Nhanh + flexible | ⚠️ Phức tạp (maintain 2 logic) |

**Project này dùng Hybrid:**
```
Regex → Quick constraint extraction → Groq → Natural language ranking
→ Best of both worlds
```

**Example full flow:**

```
Input: "Ghế gỗ dưới 2 triệu, đánh giá cao"
  │
  ├─→ Regex extract: categoryTokens=[ghe], material=[go], maxPrice=2M
  │
  ├─→ Text search + Regex search → 10+ candidates
  │
  ├─→ Filter by constraints → 5 candidates
  │
  ├─→ Groq rank + write reply → 3 final products
  │
  └─→ Return: "Ghế gỗ tuyết tùng rất tốt..." + [3 products]
```

---

## Q6: Tại sao ProductCard lệch trước, giờ fix như nào?

### Câu hỏi Full:
*"Trước dây bạn báo card bị lệch khi có sản phẩm 'kệ'. Sau đó fix. 
Vấn đề thực sự là gì? Image size sao?"*

### Cách Trả Lời:

**Vấn đề KHÔNG phải size ảnh**, vì ảnh đã fixed aspect ratio:

```javascript
<div className="relative aspect-[4/3] bg-gray-50">
  {/* aspect-[4/3] = fixed ratio, height tính từ width */}
</div>
```

**Vấn đề thực sự: 2 bugs**

**Bug 1: Hover translate**

```javascript
// ❌ CŨ
className="... hover:-translate-y-0.5"  // Nhích lên 2px khi hover

// Nếu card trong grid có 2 hàng:
// - Card đang hover: translate up → nhìn thấy button
// - Card cùng hàng: không hover → default position
// → Có vẻ hàng bị lệch (vì 1 card cao hơn)
```

**Bug 2: Grid row height**

```javascript
// ❌ CŨ
<div className="grid lg:grid-cols-4 gap-5 grid-auto-rows-fr">
  {cards}
</div>
// grid-auto-rows-fr không phải Tailwind class → hiệu lực không có!

// ✅ MỚI
<div className="grid lg:grid-cols-4 gap-5 auto-rows-fr">
  {cards}
</div>
// auto-rows-fr = tất cả rows có height = 1 fraction (chiếm diện tích bằng nhau)
```

**Cách fix:**

```diff
// ProductCard.jsx
- className="... hover:-translate-y-0.5 ..."
+ className="... "  // Bỏ hover translate

// HomeFeaturedProductsSection.jsx
- className="grid lg:grid-cols-4 gap-5 grid-auto-rows-fr"
+ className="grid lg:grid-cols-4 gap-5 auto-rows-fr"
```

**Kết quả:**

```
Trước:                          Sau:
┌──────────┐ ┌──────────┐      ┌──────────┐ ┌──────────┐
│   Card   │ │   Card   │      │   Card   │ │   Card   │  ← Same height
└──────────┘ └──────────┘      └──────────┘ └──────────┘

(Hover card 1)
┌──────────┐ (shift up)        ┌──────────┐ (NO shift)
│  Hover   │ ← Nhìn lệch!       │  Hover   │ ← Thẳng hàng!
└──────────┘                    └──────────┘
```

**Proof:**

```javascript
// Khi auto-rows-fr + h-full:
// Tất cả card trong 1 row có height = max_height_in_row
// → Nội dung căn chỉnh được

// Ví dụ:
// Card 1: [ảnh] [tên] [giá] [sao] = height 280px
// Card 2: [ảnh] [tên ngắn] [giá] [sao] = height 280px (flex-1 làm căn chỉnh)
// Card 3: [ảnh] [tên dài] [giá] [sao] = height 280px

// auto-rows-fr → cả 3 card có height = 280px
// Bỏ hover translate → không nhích lên
// → Result: hàng thẳng lắm!
```

---

## Q7: Làm sao biết số "Đã bán" là đúng?

### Câu hỏi Full:
*"ProductCard hiển thị 'Đã bán 5'. Số này từ đâu? Backend tính như nào?"*

### Cách Trả Lời:

**Backend - product.controller.js**

```javascript
const getQtySoldMap = async (productIds) => {
  // Aggregation pipeline MongoDB để tính tổng qty bán
  
  const rows = await Order.aggregate([
    // Stage 1: Match only COMPLETED orders
    { $match: { status: "completed", "items.productId": { $in: ids } } },
    
    // Stage 2: Unwind items array (1 item per row)
    // Order: [item1, item2] → 2 documents
    { $unwind: "$items" },
    
    // Stage 3: Filter again (tránh item khác)
    { $match: { "items.productId": { $in: ids } } },
    
    // Stage 4: Group by productId, sum qty
    { 
      $group: { 
        _id: "$items.productId", 
        qtySold: { $sum: "$items.qty" } 
      } 
    }
  ]);
  
  // Result: [
  //   { _id: "prod-1", qtySold: 5 },
  //   { _id: "prod-2", qtySold: 3 }
  // ]
  
  return new Map(rows.map(r => [String(r._id), r.qtySold]));
};

// Dùng ở listProducts:
const qtySoldMap = await getQtySoldMap(productIds);
return items.map(p => ({
  ...p,
  qtySold: qtySoldMap.get(String(p._id)) || 0
}));
```

**Database structure:**

```javascript
// Order document
{
  _id: "order-123",
  status: "completed",  // ← Phải completed mới count
  items: [
    { productId: "prod-1", qty: 2 },
    { productId: "prod-2", qty: 1 }
  ]
}

{
  _id: "order-124",
  status: "completed",
  items: [
    { productId: "prod-1", qty: 3 }  // ← prod-1 lại +3
  ]
}

// Aggregation kết quả:
// prod-1: 2 + 3 = 5 (đã bán)
```

**Tại sao chỉ count "completed"?**

```
Order status lifecycle:
pending → processing → shipped → completed
                                    ↑
                            Chỉ count từ đây
                            (vì completed = thực tế người dùng nhận hàng)

Không count:
- pending: người dùng chưa pay → không chắc bán
- processing: hàng đang ship → có thể cancel
- shipped: hàng đang in transit → có thể return
```

**Follow-up:**
"Nếu user return hàng sao?"
→ "Order status change thành 'returned' → Aggregation không count"
→ "Tuy nhiên, project current không implement return logic, 
   nên hiện tại không xử lý được"

---

## Q8: Làm sao handle "Token hết hạn giữa API call"?

### Câu hỏi Full:
*"User đang loggedin, thì token hết hạn. Khi call API sao? 
User bị logout hay refresh token tự động?"*

### Cách Trả Lời:

**Flow:**

```
User open website (8:00 AM)
  │
  └─→ localStorage có valid accessToken
  └─→ App bootstrap (AuthContext)
       └─→ useAuthStore.bootstrap()
           └─→ GET /me
               └─→ Verify token
               └─→ Return user if valid
               
  2 giờ sau... Token hết hạn
  │
  User click "View Orders"
  │
  └─→ GET /api/orders (với Authorization header token cũ)
       │
       └─→ Backend: token invalid (401)
           │
           └─→ Return 401 Unauthorized
  │
  └─→ Axios interceptor catch error:
       │
       if (error.response.status === 401) {
         // Token hết hạn → Logout
         useAuthStore.clearAuth();
         navigate('/login');  // Redirect login
       }
```

**Code:**

```javascript
// config/axios.js - Setup interceptor
axios.interceptors.response.use(
  (res) => res,  // Nếu success, return tnạnh lình
  
  (err) => {
    const status = err.response?.status;
    
    if (status === 401) {
      // Unauthorized → Token hết hạn hoặc invalid
      const store = useAuthStore.getState();
      store.clearAuth();  // Clear store
      localStorage.removeItem('auth');  // Clear localStorage
      window.location.href = '/login';  // Navigate to login
    }
    
    throw err;  // Re-throw để page catch
  }
);
```

**Tại sao không auto-refresh token?**

```
Refresh token pattern (JWT):
1. accessToken (short-lived, 15 min)
2. refreshToken (long-lived, 7 days)
3. Khi access hết → dùng refresh để lấy cái mới

Project này:
- Chỉ implement accessToken (simple pattern)
- Không implement refreshToken (vì session = httpOnly cookie sẽ tốt hơn)
  
Session-based (recommend):
```javascript
// Backend
app.post('/login', (req, res) => {
  // Verify password
  // Create session
  res.cookie('sessionId', session, { httpOnly: true, sameSite: 'strict' });
  res.json({ user, accessToken });
});

// Frontend không cần verify token (httpOnly tự động gửi)
// Khi session hết → Backend return 401 → Frontend logout
```

**Answer đơn giản:**
"Token hết hạn → Backend return 401 → Frontend logout + redirect login. 
Không có auto-refresh (vì simple design). Nếu muốn user không logout, 
cần implement refresh token pattern hoặc session-based auth."

---

## Q9: Deployment - Sau khi `npm run build`, gửi file đâu?

### Câu hỏi Full:
*"Build xong, folder `dist/` có những gì? Gửi lên server như nào? 
Backend cần config gì không?"*

### Cách Trả Lời:

**Build output:**

```bash
npm run build
# Output: dist/
#   ├── index.html (entry point)
#   ├── assets/
#   │   ├── main.xxx.js (bundled JS)
#   │   ├── main.xxx.css (bundled CSS)
#   │   ├── ProductCard.xxx.js (code split component)
#   │   └── ...
#   └── ...

# Tất cả static files, sẵn sàng serve
```

**Deployment strategies:**

**Strategy 1: Backend serve static (tích hợp)**

```javascript
// backend/src/server.js
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Fallback to index.html cho SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.listen(3000);  // Cả API + Frontend ở port 3000
```

**Benefit:**
- ✅ Deploy 1 process
- ✅ Same origin (không cần CORS)

**Strategy 2: Separate frontend hosting (recommended)**

```
Backend: http://api.example.com (port 3000)
Frontend: https://example.com (CDN/Vercel/Netlify)
```

**Frontend (Vercel):**
```bash
# 1. Deploy to Vercel
vercel deploy

# 2. Vercel auto-build dist/
# 3. Serve static + SPA routing
```

**Backend CORS config:**
```javascript
app.use(cors({
  origin: 'https://example.com',  // Allow frontend URL
  credentials: true
}));
```

**If manually upload to server:**

```bash
# 1. Build
npm run build

# 2. Upload dist/ to server
scp -r dist/ user@server.com:/var/www/myapp/

# 3. Configure nginx
# /etc/nginx/sites-available/myapp
server {
  listen 80;
  server_name example.com;
  
  root /var/www/myapp/dist;
  
  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
  
  location /api/ {
    proxy_pass http://localhost:3000;  # Backend API
  }
}

# 4. Restart nginx
sudo systemctl restart nginx
```

**Environment config:**

```javascript
// vite.config.js
export default defineConfig({
  define: {
    __VITE_API_URL__: JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:3000'
    )
  }
});

// client/src/services/axios.js
axios.defaults.baseURL = import.meta.env.VITE_API_URL;
```

**Build command:**
```bash
# Development
VITE_API_URL=http://localhost:3000 npm run build

# Production
VITE_API_URL=https://api.example.com npm run build
```

---

## Q10: TypeScript - Tại sao project ko dùng? Worth it không?

### Câu hỏi Full:
*"Ngày nay TypeScript là standard. Tại sao project dùng plain JavaScript? 
Nếu dùng TypeScript, cần thêm bao lâu?"*

### Cách Trả Lời:

**Pros TypeScript:**
```typescript
// ✅ Type safety
const addItem = (item: { productId: string; qty: number }) => { ... };
addItem({ productId: '123' });  // OK
addItem({ productId: 123 });    // ❌ Error: should be string

// ✅ Better IDE support
const user = getUser();  // IDE knows user = { id, email, name }
user.fa // IDE autocomplete shows ide

// ✅ Self-documenting code
function createOrder(items: OrderItem[]): Promise<Order> { ... }
// Rõ ràng function expect gì, return gì
```

**Cons TypeScript:**
```
❌ Compile step more (slow dev)
❌ Steeper learning curve
❌ Need types for ALL libraries (sometimes missing @types)
❌ More boilerplate code
```

**For this project:**

```
Project size: Small-Medium (5 pages, 10 components)
Team: 1 person (intern)
Timeline: 3 months (tight)

Cost-benefit:
- Setup TypeScript: +3 days
- Write types: +30% more code
- Catch bugs: -10% bugs
- Refactor easier: ✅

Verdict: 
JavaScript is OK for this project size
But TypeScript would be better if:
- Team 3+ engineers
- Long-term maintenance needed
- Shared library/SDK
```

**Minimal TypeScript setup:**

```bash
# If wanted to add later
npm install typescript @types/react @types/node
npx tsc --init  # Create tsconfig.json

# Rename: .jsx → .tsx
# Add types gradually
```

**Answer to interviewer:**

"Plain JavaScript cho project này là trade-off hợp lý. Nếu scaling lên, 
TypeScript là first priority. Hiện tại, focus vào features đúng hạn +  
maintainability ok."

---

## Q11 (Bonus): Mở rộng dự án thì sao? (Scaling)

### Câu hỏi Full:
*"Nếu phải thêm 10 tính năng mới, 5 engineer, 6 tháng tới. 
Architecture hiện tại có scale được không? Cần refactor gì?"*

### Cách Trả Lời:

**Scaling roadmap:**

| Hiện tại | Small Scale | Medium Scale | Large Scale |
|----------|---------|--------|----------|
| **State Mgmt** | Zustand 2 stores | Zustand 5+ stores | Redux / RTK |
| **Code Splitting** | Route-based | Component lazy + Route | Micro-frontend |
| **Testing** | None | Unit (React Testing) | Unit + E2E + Integration |
| **Type Safety** | JavaScript | TypeScript | TypeScript strict mode |
| **API Architecture** | Simple REST | GraphQL OR REST + caching | GraphQL + subscriptions |
| **Performance** | Basic optimization | Virtualization + Pagination | Worker threads + Streaming |
| **Monitoring** | None | Sentry + LogRocket | New Relic + Custom metrics |

**Small Scale (6-12 users, 1-2 features/month):**
```javascript
// Tách stores thêm
- auth.store.js
- cart.store.js
- product.store.js (cache products)
- ui.store.js (modals, toasts)

// Thêm testing
npm install --save-dev vitest @testing-library/react
// Test critical paths (auth, checkout)

// Thêm error tracking
npm install sentry/react
Sentry.init({ dsn: '...' });
```

**Medium Scale (100-1000 users, 5-10 features/month):**
```
// Migrate to TypeScript
npm install typescript @types/*

// Setup GraphQL (instead of REST)
npm install @apollo/client graphql

// Implement caching
// SWR or React Query
npm install swr  // or react-query

// Component library (Storybook)
npm install --save-dev storybook

// CI/CD pipeline
# GitHub Actions / GitLab CI
```

**Large Scale (1000+ users):**
```
// Micro-frontend architecture
// Module federation (Webpack 5)
// Feature flags (LaunchDarkly)
// SSR (Next.js)
// Headless CMS integration

// Performance monitoring
// Real user monitoring (RUM)
// Synthetic monitoring
```

**Immediate next steps:**

```
1. Add TypeScript (low cost, high benefit)
2. Add testing (critical paths: auth, cart, checkout)
3. Setup Sentry error tracking
4. Implement SWR for API caching
5. Add Storybook for component documentation
```

---

## Key Takeaways untuk Báo Cáo

**Khi nói chuyện với giáo viên/hội đồng:**

1. ✅ **Nhấn mạnh design decisions:**
   - "Chọn Zustand vì project nhỏ, cần simple"
   - "ProductCard optimize layout để hết lệch"
   - "Cart localStorage = instant experience"

2. ✅ **Giải thích trade-offs:**
   - "No TypeScript now, but could add later"
   - "No comprehensive tests, but critical paths covered"
   - "JWT token simple, could use refresh token for better UX"

3. ✅ **Show awareness of scaling:**
   - "Nếu grow, sẽ migrate TypeScript, RTK, GraphQL"
   - "Current architecture flexible để add features"

4. ✅ **Technical depth:**
   - Giải thích Zustand persist middleware
   - Giải thích auto-rows-fr grid layout
   - Giải thích VNPay signature verification

5. ✅ **Problem-solving:**
   - "Card lệch lúc trước → Root cause: hover translate + grid-auto-rows-fr"
   - "Không phải image size → Đó là misconception, đã debug kỹ"

---

**Good luck báo cáo! 💪**
