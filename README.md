<p align="center">
  <img src="https://vitejs.dev/logo.svg" width="100" alt="Vite Logo" />
</p>

# Smart Restaurant - App Frontend

Frontend ứng dụng đặt món, thanh toán, quản lý đơn, hóa đơn, review... dành cho khách, nhân viên phục vụ, bếp của nhà hàng thông minh.

---

## 🚀 Công nghệ sử dụng

- **React** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (UI)
- **Axios** (API)
- **React Router** (routing)
- **Zustand** (state management)
- **Socket.IO** (real-time)
- **VNPay** (thanh toán online)

---

## 📝 Mô tả luồng hoạt động

1. Khách vào nhà hàng, quét QR tại bàn → truy cập menu, đặt món, gửi đơn hàng.
2. Đơn hàng được tạo, trạng thái cập nhật real-time cho khách, nhân viên, bếp.
3. Khách xem/trả hóa đơn, thanh toán online qua VNPay hoặc tại quầy.
4. Nhân viên xác nhận, phục vụ, cập nhật trạng thái đơn, hóa đơn, bàn.
5. Khách đánh giá món ăn, xem review, lịch sử đơn hàng.

---

## ⚙️ Cài đặt & chạy dự án

### 1. Cài đặt dependencies

```bash
npm install
# hoặc
yarn install
```

### 2. Tạo file .env

Sao chép file `.env.example` thành `.env` và cập nhật các giá trị phù hợp:

```env
VITE_API_URL=http://localhost:3001
# ... các biến khác nếu có
```

### 3. Chạy ứng dụng

```bash
# Chạy ở chế độ phát triển
npm run dev
# hoặc
yarn dev

# Build production
npm run build
# hoặc
yarn build
```

App mặc định chạy tại http://localhost:5174

---

## 🗂️ Cấu trúc thư mục chính (src/)

```text
src/
├── api/           # Gọi API backend (menu, order, bill, review...)
├── pages/         # Các trang chính (Menu, Cart, Bill, Orders, Login, Register...)
│   ├── user/      # Trang cá nhân
│   ├── waiter/    # Trang cho nhân viên phục vụ
│   └── kds/       # Trang cho bếp (KDS)
├── components/    # Component tái sử dụng (Review, Button...)
├── auth/          # Xác thực, bảo vệ route, context
├── layout/        # Layout tổng thể
├── config/        # Cấu hình chung
├── hooks/         # Custom hooks
├── routes/        # Định tuyến
├── store/         # State management (Zustand)
├── utils/         # Tiện ích
├── App.tsx        # Root component
├── main.tsx       # Entry point
```

### Mô tả các module/trang chính

---

## 📡 Các API chính sử dụng

| Chức năng  | Endpoint (method)                     | Mô tả                       |
| ---------- | ------------------------------------- | --------------------------- |
| Menu       | GET /public/menu                      | Lấy menu, categories, items |
| Đặt món    | GET /public/orders/open-session       | Mở phiên đặt món (theo bàn) |
|            | POST /public/orders/:orderId/items    | Thêm món vào đơn nháp       |
|            | POST /public/orders/:orderId/submit   | Gửi đơn hàng                |
| Hóa đơn    | GET /public/bills/active              | Lấy hóa đơn hiện tại        |
|            | POST /public/bills/request            | Yêu cầu thanh toán          |
|            | POST /public/bills/:billId/pay-cash   | Thanh toán tiền mặt         |
|            | POST /public/bills/:billId/pay-online | Thanh toán online (VNPay)   |
| Thanh toán | POST /api/payments/vnpay/create       | Tạo giao dịch VNPay         |
|            | GET /api/payments/vnpay/return        | Xác thực kết quả VNPay      |
| Review     | GET /api/items/:itemId/reviews        | Lấy đánh giá món ăn         |
|            | POST /api/items/:itemId/reviews       | Đánh giá món ăn             |
|            | PATCH/DELETE /api/reviews/:reviewId   | Sửa/Xóa review              |
| Auth       | POST /api/auth/login                  | Đăng nhập                   |
|            | POST /api/auth/register               | Đăng ký                     |
|            | POST /api/auth/forgot-password        | Quên mật khẩu               |
|            | POST /api/auth/reset-password         | Đặt lại mật khẩu            |
|            | GET /api/accounts/profile             | Lấy thông tin cá nhân       |

Ví dụ request lấy menu:

```json
GET /public/menu?table=abc123&token=xyz
```

Ví dụ response:

```json
{
   "table": { "_id": "...", "tableNumber": "1" },
   "categories": [{ "_id": "...", "name": "Món chính" }],
   "items": [{ "_id": "...", "name": "Cơm chiên", "priceCents": 35000 }]
}
```

## 🐛 Troubleshooting & FAQ

### Lỗi không kết nối được API backend

**Giải pháp:** Kiểm tra biến `VITE_API_URL` trong file `.env` đã đúng URL backend chưa. Đảm bảo backend đang chạy.

### Lỗi CORS khi gọi API

**Giải pháp:** Đảm bảo backend đã bật CORS cho domain frontend (mặc định localhost:5174).

### Lỗi không load được biến môi trường

**Giải pháp:** Đảm bảo đã tạo file `.env` đúng định dạng, không có dấu cách/thừa dòng.

### Lỗi build hoặc dependency

**Giải pháp:** Xóa node_modules, chạy lại `npm install` hoặc `yarn install`.

---

## 📝 Ghi chú

- **API URL:** Toàn bộ request sẽ dùng biến `VITE_API_URL` trong `.env`.
- **Port mặc định:** Frontend chạy tại 5174, backend tại 3001 (có thể thay đổi).
- **Bảo mật:** Không commit file `.env` lên git, đổi secret khi deploy thật.
- **Production:** Build production với `npm run build` và deploy lên server static bất kỳ.

```json
{
   "table": { "_id": "...", "tableNumber": "1" },
   "categories": [{ "_id": "...", "name": "Món chính" }],
   "items": [{ "_id": "...", "name": "Cơm chiên", "priceCents": 35000 }]
}
```
