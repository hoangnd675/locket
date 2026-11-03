# Thay đổi

## 4.1.1 — chuyển đường phát hành sang Cuios-shop

- Cùng repo được chuyển chủ sở hữu, giữ lịch sử và mọi artifact cũ.
- Module/JS/ảnh dùng URL Organization; nhãn tác giả module là Cuios.shop.
- Giữ logic quay/upload, mic, ghi chú và widget; không tự bật private.
- Dựng lại runtime chuẩn/protected với hash mới; thông báo LICENSE gốc giữ nguyên.

## 4.1.0 — quay 60s, nhập 10s/6 MiB

- Tách ngữ cảnh recording/upload/trim và trần byte nhập; giữ kiểu dữ liệu, đơn vị, codec và trường chưa rõ nghĩa.
- Xử lý audio.enabled trong các nhánh media lồng nhau; chưa xác minh mic native.
- Giữ renderer server cho ghi chú; 54 mẫu nền gradient mặc định, giữ khung widget gốc.
- Trang status/report qua HTTPS host thật, tên/kiểu cờ media root và kho chẩn đoán tách version.
- Module mới locket60s_10s_6mb.sgmodule, runtime hash mới, giữ artifact v4.0.0. 44 test offline; chưa kiểm thử chức năng trên iPhone.


## 4.0.0 — profile thống nhất, chẩn đoán và xử lý revision

- Nhận diện bundle ID, thêm host dự phòng RevenueCat chính thức, chẩn đoán route chưa hỗ trợ.
- ETag theo nội dung Firebase đã sửa, giữ metadata và state UPDATE; không tạo/replay cấu hình thiếu entries.
- Một runtime có tên chứa hash cho toàn bộ rule; một profile 60s/100 MiB/54 ghi chú và một variant giữ khung server.
- Trang trạng thái/report cục bộ, lưu riêng từng service; redaction, lỗi storage và freshness rõ ràng.
- Giữ nội dung mic/media/54 ghi chú/nền/khung của nhánh trước; 39 kiểm thử offline.
- Chưa xác nhận ổn định trên iPhone. Cần báo cáo từ thiết bị để xác định lỗi thực tế còn lại.

Các repo nguồn giữ nguyên. Tên repo stable không phải chứng nhận mọi chức năng native đã hoạt động.
