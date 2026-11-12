# ElectronicY – Web bán hàng

Website bán điện máy cho khách hàng: xem sản phẩm, lọc và so sánh, giỏ hàng với khuyến mãi tự áp dụng, đặt hàng và thanh toán (mô phỏng), theo dõi đơn, tra cứu bảo hành, gửi yêu cầu đổi trả, hạng thành viên và trợ lý ảo.

Đây là **bản tĩnh**: toàn bộ nghiệp vụ chạy ngay trên trình duyệt, dữ liệu lưu trong `localStorage`. Không cần cài Node.js hay máy chủ, đưa lên GitHub Pages là chạy.

## Chạy thử trên máy
Mở `index.html` bằng trình duyệt, hoặc dùng tiện ích Live Server trong VS Code.

## Đưa lên GitHub Pages
1. Tạo repository mới trên GitHub, ví dụ `electronicy-shop`.
2. Tải toàn bộ nội dung thư mục này lên repository (kéo thả trong mục **Add file → Upload files**, hoặc dùng `git push`).
3. Vào **Settings → Pages**, phần **Branch** chọn `main` và thư mục `/ (root)`, bấm **Save**.
4. Đợi 1–2 phút, trang sẽ có địa chỉ `https://<tên-github>.github.io/electronicy-shop/`.

## Tài khoản khách mẫu
| Số điện thoại | Mật khẩu | Hạng |
|---|---|---|
| 0901234567 | 123456 | Kim cương |
| 0912345678 | 123456 | Vàng |
| 0933456789 | 123456 | Bạc |

Có thể tự đăng ký tài khoản mới ngay trên web.

## Cấu trúc
```
index.html          trang duy nhất (điều hướng bằng #/…)
css/shop.css        giao diện
js/shop.js          giao diện và thao tác của khách
js/engine.js        dữ liệu mẫu + quy tắc nghiệp vụ + trợ lý ảo + lớp API giả lập máy chủ
assets/             logo, banner, ảnh sản phẩm (assets/products/<SKU>.webp)
```

## Lưu ý
- Dữ liệu (đơn hàng, tài khoản, hội thoại) chỉ nằm trên trình duyệt đang dùng. Muốn về dữ liệu ban đầu: mở DevTools → Application → Local Storage → xóa các khóa bắt đầu bằng `ey_`.
- Bản này chưa nối với web nội bộ: khi khách bấm "Gặp nhân viên CSKH", hội thoại được chuyển nhưng chưa có nhân viên trả lời. Phần kết nối hai web sẽ làm sau (cần một máy chủ chung).
