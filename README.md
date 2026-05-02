# Thesis Project — E-commerce nội thất (MERN)

Dự án gồm 2 phần:

- **Backend**: Node.js + Express + MongoDB (Mongoose), xác thực JWT + refresh cookie, upload ảnh Cloudinary, thanh toán VNPay/MoMo, AI tư vấn sản phẩm (Groq).
- **Client**: React (Vite) + Ant Design + Tailwind, Google OAuth.

## Yêu cầu cài đặt (phần mềm)

- **Node.js**: khuyến nghị **Node 18+ (LTS)** hoặc **Node 20+ (LTS)**.
- **npm** (đi kèm Node) hoặc pnpm/yarn (project đang dùng npm scripts).
- **MongoDB**: local hoặc MongoDB Atlas.
  - Gợi ý: nếu muốn dùng transaction MongoDB đúng nghĩa, MongoDB cần chạy **replica set**. Project có fallback nếu môi trường không hỗ trợ transaction.

## Cài thư viện

Mở 2 terminal:

### Backend

```bash
cd backend
npm install
```

### Client

```bash
cd client
npm install
```

## Chuẩn bị file .env

Project dùng 2 file môi trường:

- `backend/.env` (được load bởi `dotenv` khi `NODE_ENV != production`)
- `client/.env` (Vite, chỉ đọc các biến bắt đầu bằng `VITE_`)

### 1) Backend: `backend/.env`

Tối thiểu để chạy backend (dev):

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGO_URI=mongodb://127.0.0.1:27017/thesis_project

# CORS + redirect return (FE)
CLIENT_URL=http://localhost:5173

# Base URL của server (khuyến nghị set trong môi trường deploy hoặc khi sau proxy)
SERVER_URL=http://localhost:3000

# JWT (nên thay bằng chuỗi dài, random)
JWT_ACCESS_SECRET=dev_access_secret_change_me
JWT_REFRESH_SECRET=dev_refresh_secret_change_me
JWT_PASSWORD_RESET_SECRET=dev_password_reset_secret_change_me

# JWT expires (khuyến nghị)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_PASSWORD_RESET_EXPIRES_IN=10m

# Cloudinary (BẮT BUỘC: backend sẽ fail khi thiếu)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Các biến tuỳ chọn (bật tính năng tương ứng):

```env
# Google Login (backend verify id_token) — dev có fallback, prod nên set
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# SMTP (gửi OTP reset mật khẩu) — dev có thể bỏ qua, prod nên set
SMTP_SERVICE=gmail
# hoặc dùng SMTP_HOST/SMTP_PORT nếu không dùng service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=No Reply <your_email@gmail.com>

# Password reset OTP behaviour
OTP_MAX_ATTEMPTS=5
PASSWORD_RESET_OTP_MINUTES=3

# Groq AI (AI assistant)
GROQ_API_KEY=your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile

# AI scope guard (tuỳ chọn)
AI_OOS_KEYWORDS=condom,thuoc la,ruou
AI_APPEND_PRODUCT_SNIPPETS=true

# Review moderation (tuỳ chọn)
REVIEW_BANNED_TERMS=term1,term2

# Bad words file/extra terms (tuỳ chọn)
BAD_WORDS_FILE=./src/data/vn_offensive_words.txt
BAD_WORDS_EXTRA=word1,word2

# VNPay (nếu dùng)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_SECURE_SECRET=your_secure_secret
VNPAY_HOST=https://sandbox.vnpayment.vn
VNPAY_TEST_MODE=true

# MoMo (nếu dùng)
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REQUEST_TYPE=captureWallet
MOMO_PARTNER_NAME=
MOMO_STORE_ID=
MOMO_ORDER_GROUP_ID=
```

Ghi chú:

- `CLOUDINARY_*` là bắt buộc vì module Cloudinary được import ngay khi load controller product/review.
- Với VNPay/MoMo: nếu không cấu hình thì chỉ các endpoint thanh toán sẽ lỗi; các phần khác vẫn chạy.

### 2) Client: `client/.env`

```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## Chạy dự án (dev)

### Backend

```bash
cd backend
npm run dev
```

Server mặc định chạy: `http://localhost:3000`.

### Client

```bash
cd client
npm run dev
```

Client mặc định chạy: `http://localhost:5173`.

## Seed dữ liệu (tuỳ chọn)

Backend có script seed:

```bash
cd backend
npm run seed
```

Xoá + seed lại:

```bash
cd backend
npm run seed:wipe
```

## Ghi chú vận hành

- **CORS**: backend đọc `CLIENT_URL` để whitelist origin; Vite dev origin (`http://localhost:517x`) được cho phép.
- **Transaction MongoDB**: có dùng `withTransaction()` ở flow admin update order status. Nếu MongoDB không hỗ trợ transaction (standalone), code có nhánh fallback.
- **Thanh toán**: với VNPay/MoMo, Order chỉ được tạo khi callback/return thành công; thất bại chỉ đánh dấu pending failed.
