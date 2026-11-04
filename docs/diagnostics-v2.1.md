> Tài liệu lịch sử kế thừa từ repo gốc; xem README và UPGRADE-v3.md cho bản hiện tại.

# Trạng thái và chẩn đoán v2.1

## Bằng chứng từ thiết bị

Người dùng xác nhận v2.0 quay được 60 giây trên Shadowrocket. Bản Locket vừa tải từ App Store không hiện yêu cầu mic, picker chỉ có ảnh và không hiện ghi chú mới. Chưa xác nhận gửi video đủ 60 giây hoặc có tiếng.

Không thể coi các cờ media từng thêm là đã hoạt động. Không có quyền truy cập iPhone, source native hoặc response Firebase thật từ thiết bị trong môi trường phát triển này.

## Sửa trong v2.1

- Giữ thuật toán/thời lượng 60 giây; thêm các cờ tương thích ở camera/camera_roll mà không thay codec, bitrate, upload API hay bucket.
- Thử `mh_mic_enabled_v16` theo tài liệu đối chiếu cấu hình. Chưa có bằng chứng đây là key thực của Locket 2.70 hoặc nó có thể kích hoạt thu âm.
- Sửa việc ID của ghi chú custom chỉ có trong overlay_items: thêm các ID tương ứng vào overlay_dynamic_captions, giữ các ID đã có. Đây là giả thuyết tương thích cần test trên client, không phải nguyên nhân đã được xác nhận.
- Log cấu trúc các entry và trạng thái một danh sách flag cố định trước khi ghi đè. Các chuỗi giá trị lạ chỉ được ghi là other/unparsed-string; không in nội dung gốc.
- Khung PNG có tâm trong suốt được đặt trong variant riêng bằng schema widget_frame_event từ module gốc. Không có cơ sở để khẳng định schema menu/style khung mới được native hỗ trợ, nên không tự dựng chúng.

## Log cần lấy

Tìm ba dòng dạng dưới đây, sao chép chính những dòng có tiền tố này từ Shadowrocket:

```text
[locket30s-fixed] diag v2.1.0 input schema ...
[locket30s-fixed] diag v2.1.0 input flags ...
[locket30s-fixed] firebase: v2.1.0 config target=60s; captions added=...; widget=...
```

Hai dòng diag mô tả input từ server, không phải giá trị đã được module ép bật. on/off/absent chỉ thể hiện có/không trong response, không chứng minh app có đọc key đó. absence cũng không chứng minh native không hỗ trợ vì app có thể dùng giá trị mặc định nội bộ.

Nếu không có log Firebase, kiểm tra module/script đã tải lại và app thực sự fetch config. Nếu overlay_items không phải mảng, cần xác định schema thật trước khi thêm ghi chú. Nếu cấu trúc phù hợp, script chạy nhưng giao diện vẫn thiếu chức năng, bước tiếp theo là xác định client dùng key khác, chưa activate hay không có triển khai native tương ứng.

## Giới hạn về mic và bộ chọn video

[Apple yêu cầu app xin quyền microphone](https://support.apple.com/en-lamr/guide/iphone/iph168c4bbd5/ios). Proxy không tự cấp quyền iOS. Không khuyên reset toàn bộ quyền riêng tư hoặc cài lại app liên tục để sửa cờ mạng.

Nếu picker native được lập trình chỉ cho ảnh hoặc pipeline xuất video không tạo audio track, thay JSON không bổ sung được phần triển khai đó. Chưa có source/native inspection để kết luận chắc chắn trường hợp của người dùng thuộc nhánh này. Cần phân biệt giới hạn client với feature flag trước khi hứa sửa.

25 bài kiểm thử xác nhận logic dữ liệu, bảo toàn response và log không chứa nội dung riêng. Chúng không kiểm chứng microphone, picker, renderer hay upload thực tế trên iPhone.
