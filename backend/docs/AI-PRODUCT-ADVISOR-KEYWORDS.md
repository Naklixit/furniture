# AI Tư Vấn Sản Phẩm - Hướng Dẫn Keywords

## Tổng Quan

Hệ thống AI tư vấn sản phẩm nội thất có khả năng hiểu các từ khóa mà người dùng nhập vào và tự động trích xuất các ràng buộc (constraints) để giới hạn tập sản phẩm.

## 1. Keywords Về Giá Tiền (Price Constraints)

### Cách Phát Biểu Khoảng Giá

#### Pattern 1: "Từ X đến Y"

```
"từ 1 triệu đến 2 triệu"
"từ 500k đến 1 triệu"
"từ 2 tr đến 3 tr"
```

#### Pattern 2: "X - Y" (dấu gạch ngang)

```
"1 triệu - 3 triệu"
"500k - 1.5 triệu"
"2.5 tr - 4 tr"
```

#### Pattern 3: Giới Hạn Dưới (Min Price)

- `"từ 1 triệu trở lên"` → min = 1M
- `"trên 500 thìn"` → min = 500K
- `"tối thiểu 1 triệu"` → min = 1M
- `"ít nhất 2 triệu"` → min = 2M

#### Pattern 4: Giới Hạn Trên (Max Price)

- `"dưới 2 triệu"` → max = 2M
- `"tối đa 1.5 triệu"` → max = 1.5M
- `"không quá 3 triệu"` → max = 3M
- `"tối đa 500k"` → max = 500K

### Đơn Vị Tiền Được Hỗ Trợ

- **Triệu**: `triệu`, `tr`, `m`
- **Nghìn**: `nghìn`, `ngàn`, `k`
- **VND**: `vnd`, `đ`, `dong`

### Ví Dụ Trọn Bộ

```
"Tôi muốn mua ghế gỗ từ 1-2 triệu"
→ categoryToken: ["ghe"], materialToken: ["go"], minPrice: 1000000, maxPrice: 2000000

"Sofa dưới 5 triệu"
→ categoryToken: ["sofa"], maxPrice: 5000000

"Bàn ăn ngàn 500 tới 1.5 triệu"
→ categoryToken: ["ban"], minPrice: 500000, maxPrice: 1500000
```

---

## 2. Keywords Về Danh Mục Sản Phẩm (Category)

### Ghế (Chair)

**Keywords**: `ghế`, `chair`, `armchair`, `ghế sofa`, `ghế ăn`, `ghế xoay`

```
"Tôi cần một chiếc ghế"
"Có ghế bọc vải không?"
"Chair gỗ giá rẻ"
```

### Sofa

**Keywords**: `sofa`, `xô pha`, `sopha`, `ghế xôi pha`

```
"Sofa 3 chỗ khoảng 10 triệu"
"Cần sofa da cao cấp"
"Sofa vải bền"
```

### Bàn (Table)

**Keywords**: `bàn`, `table`, `bàn ăn`, `bàn làm việc`, `bàn cà phê`

```
"Bàn ăn gỗ 4 người"
"Table hiện đại dưới 3 triệu"
"Bàn sofa kính"
```

### Giường (Bed)

**Keywords**: `giường`, `bed`, `giường ngủ`, `giường đôi`, `giường đơn`

```
"Giường gỗ sồi giá khoảng 5 triệu"
"Cần giường 1m6 tối giản"
"Bed hiện đại có đầu giường"
```

### Đèn (Lamp/Light)

**Keywords**: `đèn`, `lamp`, `light`, `đèn bàn`, `đèn treo`, `đèn chân`

```
"Đèn chân gỗ cho sofa"
"Lamp hiện đại 500k"
"Đèn treo phòng khách"
```

### Tủ (Cabinet/Wardrobe)

**Keywords**: `tủ`, `cabinet`, `tủ quần áo`, `wardrobe`, `tủ đựng`

```
"Tủ quần áo gỗ 2m"
"Cabinet lưu trữ nhỏ gọn"
"Tủ áo hiện đại giá 3 triệu"
```

### Kệ (Shelf)

**Keywords**: `kệ`, `shelf`, `kệ sách`, `kệ treo tường`, `kệ đựng`

```
"Kệ sách mở 3 tầng"
"Shelf treo tường gỗ"
"Kệ hiện đại cho văn phòng"
```

---

## 3. Keywords Về Chất Liệu (Material)

### Gỗ (Wood)

**Keywords**: `gỗ`, `wood`, `wooden`, `oak`, `walnut`, `pine`, `tự nhiên`, `gỗ tần bì`, `gỗ sồi`, `gỗ óc chó`

```
"Ghế gỗ tự nhiên"
"Sofa gỗ walnut"
"Bàn wood hiện đại"
→ materialToken: ["go"]
```

### Kim Loại (Metal)

**Keywords**: `kim loại`, `metal`, `sắt`, `inox`, `thép`, `nhôm`, `aluminium`, `kính`

```
"Ghế kim loại màu đen"
"Bàn kính chân sắt"
"Kệ inox bền vững"
→ materialToken: ["kimloai"]
```

### Da (Leather)

**Keywords**: `da`, `leather`, `da thật`, `da công nghiệp`, `da lộn`

```
"Sofa da cao cấp"
"Ghế da đen sang trọng"
→ materialToken: ["da"]
```

### Vải (Fabric)

**Keywords**: `vải`, `fabric`, `vải bù`, `vải nỉ`, `satin`, `cotton`, `linen`

```
"Ghế vải thoải mái"
"Sofa fabric dễ vệ sinh"
"Fabric tự chọn màu"
→ materialToken: ["vai"]
```

### Nhựa (Plastic)

**Keywords**: `nhựa`, `plastic`, `pp`, `abs`, `composite`

```
"Ghế nhựa thành phố"
"Bàn plastic nhẹ"
→ materialToken: ["nhua"]
```

### Kính (Glass)

**Keywords**: `kính`, `glass`, `mặt kính`, `kính cường lực`

```
"Bàn kính sang trọng"
"Kệ mặt kính"
→ materialToken: ["kinh"]
```

### Kết Hợp Chất Liệu

```
"Ghế gỗ tự nhiên bọc vải"
→ Material: gỗ, vải

"Bàn gỗ sồi chân kim loại"
→ Material: gỗ, kim loại

"Sofa da đen khung gỗ"
→ Material: da, gỗ
```

---

## 4. Keywords Về Đánh Giá & Review (Rating)

### Đánh Giá Cao

**Keywords**:

- `đánh giá cao`, `sao cao`, `rating cao`, `review tốt`, `nhiều sao`
- `4 sao trở lên`, `từ 4.5 sao`, `tối thiểu 4 sao`

```
"Ghế có đánh giá cao"
→ minRating: 4

"Sofa 4.5 sao trở lên"
→ minRating: 4.5

"Sản phẩm review tốt"
→ minRating: 4
```

### Cách Nói Cụ Thể

```
"5 sao" → minRating: 5
"Từ 4 sao" → minRating: 4
"4 sao trở lên" → minRating: 4
"Ít nhất 4.5 sao" → minRating: 4.5
"Khoảng 4 sao" → minRating: 3.5-4.5
"Đánh giá cao" → minRating: 4
```

---

## 5. Keywords Về Khuyến Mại & Giảm Giá (Sale/Discount)

**Keywords**:

- `giảm giá`, `khuyến mại`, `sale`, `discount`, `ưu đãi`, `đang bán`
- `rẻ`, `giá tốt`, `hời`

```
"Ghế đang giảm giá"
→ wantsOnSale: true

"Sofa khuyến mại dưới 3 triệu"
→ wantsOnSale: true, maxPrice: 3000000

"Sản phẩm sale bây giờ"
→ wantsOnSale: true
```

---

## 6. Ví Dụ Truy Vấn Thực Tế

### Ví Dụ 1: Truy Vấn Đơn Giản

```
Input: "Ghế gỗ giá dưới 2 triệu"

Phân Tích:
- Category: "ghe"
- Material: "go"
- MaxPrice: 2000000

Kết Quả: Tìm 3 sản phẩm ghế gỗ có giá ≤ 2 triệu tốt nhất
```

### Ví Dụ 2: Truy Vấn Phức Tạp

```
Input: "Sofa da 4 người từ 5 đến 10 triệu, đánh giá cao, đang giảm giá"

Phân Tích:
- Category: "sofa"
- Material: "da"
- MinPrice: 5000000
- MaxPrice: 10000000
- MinRating: 4
- OnSale: true

Kết Quả: Top 3 sofa da có giá 5-10M, đánh giá 4+ sao, đang giảm giá
```

### Ví Dụ 3: Khuyết Thông Tin

```
Input: "Cần sofa chất liệu tốt"

Hệ Thống Nhận Định:
- Category: "sofa" ✓
- Material: KHÔNG xác định rõ ✗
- Price: KHÔNG xác định ✗

AI Sẽ:
- Hỏi: "Bạn thích sofa da, vải hay khác? Và dự kiến tầm giá bao nhiêu?"
- Sau khi biết: Mới gợi ý sản phẩm
```

---

## 7. Các Ràng Buộc Được Hỗ Trợ

| Loại             | Ký Hiệu          | Ví Dụ             |
| ---------------- | ---------------- | ----------------- |
| **Giá Min**      | `minPrice`       | "từ 1 triệu"      |
| **Giá Max**      | `maxPrice`       | "dưới 3 triệu"    |
| **Đánh Giá Min** | `minRating`      | "4 sao trở lên"   |
| **Giảm Giá**     | `wantsOnSale`    | "đang giảm giá"   |
| **Danh Mục**     | `categoryTokens` | "ghế", "sofa"     |
| **Chất Liệu**    | `materialTokens` | "gỗ", "da", "vải" |

---

## 8. Hành Vi của Hệ Thống

### Khi User Nói Không Rõ Ràng

```
Input: "Ghế gỗ"
→ Thiếu: giá, đánh giá, phong cách

AI Response:
"Ghế gỗ là lựa chọn tốt! Để mình gợi ý đúng hơn, bạn cho mình biết:
- Dùng cho phòng nào? (phòng khách, phòng ăn, văn phòng?)
- Tầm giá khoảng bao nhiêu?
- Thích kiểu hiện đại hay cổ điển?"
```

### Khi User Nói Rất Chi Tiết

```
Input: "Ghế bọc vải cotton từ 800k đến 1.5 triệu, đánh giá 4.5 sao, dùng cho phòng khách"
→ Hệ thống trích xuất đầy đủ constraints
→ Trả lại 3 sản phẩm tốt nhất phù hợp
```

### Khi Không Có Sản Phẩm Phù Hợp

```
Input: "Ghế gỗ dưới 100k"
→ Không có sản phẩm trong khoảng giá

AI Response:
"Tiếc là hiện tại mình chưa có ghế gỗ trong tầm giá 100k.
Số sản phẩm rẻ nhất hiện có khoảng 300-400k.
Bạn có thể tăng budget lên chút không, hoặc xem xét vật liệu khác (nhựa, kim loại)?"
```

---

## 9. Best Practices cho User

### ✅ Cách Nói Tốt

```
"Muốn mua sofa da 3 chỗ từ 5 đến 8 triệu, đánh giá cao, dùng cho phòng khách"
→ Đầy đủ thông tin, AI hiểu rõ
```

### ❌ Cách Nói Kém

```
"Ghế cái nào tốt?"
→ Quá mơ hồ, AI phải hỏi thêm
```

### 💡 Cách Tối Ưu

```
"Ghế ăn gỗ 4 người khoảng 2 triệu"
→ Phí rõ ràng, nhưng thiếu chút nữa (chất bọc, phong cách)

AI: "Ghế ăn gỗ giá 2 triệu có nhiều loại, bạn thích bọc nệm hay đệm tươi? Và thích phong cách nào?"
```

---

## 10. Lưu Ý Kỹ Thuật

### Diacritic & Cách Viết

- Hệ thống tự động chuẩn hóa dấu tiếng Việt
- Hỗ trợ cả `triệu` và `trieu`, `ghế` và `ghe`
- Không phân biệt hoa/thường

### Các Đơn Vị Tương Đương

```
"1 triệu" = "1 tr" = "1 m" = "1000000 đ"
"500 nghìn" = "500k" = "500 ngàn" = "500.000 đ"
```

### Ký Tự Đặc Biệt

- Dấu gạch ngang: `-` hay `–`
- Từ "đến" hay "tới": đều được chấp nhận
- "Từ", "từ", "Từ": đều được hiểu

---

## 11. FAQ

**Q: Nếu nói "ghế gỗ" mà không nói giá, AI sẽ gợi ý cái nào?**
A: AI sẽ hỏi thêm về ngân sách trước. Nếu user không trả lời, AI sẽ gợi ý 3 sản phẩm ghế gỗ phổ biến (đánh giá cao, bán chạy nhất).

**Q: Tại sao lại giới hạn 3 sản phẩm thay vì 5?**
A: Để tăng tính thuận tiện - user không phải cuộn quá dài, dễ dàng so sánh 3 lựa chọn tốt nhất.

**Q: Nếu nói "vải hoặc da", AI sẽ hiểu không?**
A: Hiện tại hệ thống chưa hỗ trợ "hoặc" (OR logic). Nên nói "vải", AI sẽ tìm vải. Nếu không thích kết quả, user có thể hỏi lại "da xem".

**Q: Có thể nói "ghế rẻ nhất" không?**
A: Có thể, nhưng AI sẽ hiểu đó là "giá cạnh tranh" và tìm ghế có giá hợp lý nhất (khoảng 500k-1.5M).

---

## 12. Tương Tác Tự Nhiên của AI

Hệ thống AI được thiết kế để:

1. **Hiểu**: Tự động phân tích constraints từ lời nói tự nhiên
2. **Hỏi**: Yêu cầu làm rõ khi thông tin chưa đủ
3. **Gợi ý**: Trả lại 3 sản phẩm tốt nhất phù hợp
4. **Giải thích**: Nói rõ tại sao sản phẩm này phù hợp (giá hợp lý, chất liệu tốt, đánh giá cao)
5. **Linh hoạt**: Không trả lời lặp lại, dễ chịu như nhân viên bán hàng thực thụ

---

**Cập nhật lần cuối**: 2026-04-16
**Phiên bản**: 1.0
