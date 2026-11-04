# Cuios v4.0.5 · Giữ menu gốc khi thử Locket Looks

## Xung đột ghi chú đã tìm thấy

Trong bản 4.0.4, `captionPatch` thay toàn bộ `overlay_items` và `overlay_dynamic_captions` bằng danh sách 94 ghi chú tĩnh. Một mục gốc của app hoặc mục mới nằm trong hai danh sách này sẽ bị loại. Test hồi quy dùng một mục AI giả lập để tái hiện việc mất mục ở bản cũ và xác nhận bản mới giữ nguyên mục đó. **Chưa có cấu hình trực tiếp từ máy nên chưa thể kết luận Looks thật nằm ở đây hoặc đây là nguyên nhân duy nhất.**

Bản Looks 4.0.5 giữ nhóm/mục/type gốc trước, rồi thêm nhóm Cuios. Giữ metadata, thứ tự, kiểu dữ liệu chưa biết trong danh sách; chỉ thay các ID trùng chính xác với 94 ID do module sinh để tránh lặp ghi chú. Nếu thiếu một trong hai danh sách, JSON lỗi hoặc schema nhóm thay đổi, giữ nguyên cả hai entry, không tự tạo catalogue thay thế. Điều này tránh che các giá trị mặc định bên trong app bằng danh sách tự dựng.

Các cờ `captions_enabled`, `overlay_navigator_enabled`, `music_caption_enabled`, `music_caption_song_preview_enabled`, `link_caption_link_enabled` và toàn bộ `overlays_v2_config` được giữ nguyên trong cả hai bản Looks. Không ép menu quay lại chế độ cũ. Module thường giữ hành vi trước đó.

Khung Aura của module được cấu hình riêng qua `widget_frame_event`. Bản Looks ghép giữ khung Aura; bản Native không ghi đè `widget_frame_event`, giúp đối chiếu cả phần ghi chú và khung mod mà vẫn giữ cấu hình media.

## Căn cứ

[Google Cloud giới thiệu Locket Looks](https://cloud.google.com/customers/locket): người dùng có thể dùng AI thêm kiểu tóc, trang phục và hiệu ứng vui vào selfie. Bài viết xác nhận Locket dùng Nano Banana 2 Lite để xử lý ảnh. [Locket công bố hợp tác trên trang công ty](https://www.linkedin.com/company/locket-labs-inc), đề cập triển khai tới người dùng trẻ tại Mỹ; thông tin này không xác nhận tài khoản/khu vực khác đã được cấp tính năng.

Tên `camera_filter_config` và ba field bên dưới được đối chiếu trong các triển khai cấu hình công khai. Đây là bằng chứng về cách triển khai của cộng đồng, **không phải tài liệu API hay bản chụp cấu hình từ iPhone của người dùng**. Phần thử nghiệm chỉ dùng tên field, không sao chép catalogue hay các thay đổi khác từ những triển khai đó. Hiệu lực trên bản App Store hiện tại cần được thử thực tế.

## Cấu hình thử

| Entry | Field | Giá trị |
| --- | --- | --- |
| `camera_filter_config` | `show_filter_button` | `true` (boolean trong JSON lồng) |
| `camera_filter_config` | `sheet_enabled` | `true` |
| `camera_filter_config` | `allows_custom_filters` | `true` |

Giữ nguyên mọi field khác, gồm `sheet_filters`, `picker_filters`, thiết lập tự mở bảng, giới hạn, model, endpoint và bộ lọc an toàn nếu server cung cấp. Không tự thêm ID filter, prompt, model hoặc cờ AI phỏng đoán. Nếu entry thiếu, chỉ bổ sung object ba cờ; khi đó chưa có bằng chứng app có catalogue để hiển thị. Nếu entry có schema lạ hoặc JSON lỗi, giữ nguyên giá trị và báo `skipped_schema`.

Các cờ giao diện không tạo quyền xử lý ảnh trên server. Có nút Looks nhưng không dựng được ảnh vẫn có thể do quyền tài khoản, rollout hoặc schema/client; chưa đủ bằng chứng kết luận nguyên nhân. Module không sửa request/response tạo ảnh, không giả kết quả AI, không gọi dịch vụ AI bên ngoài và không tắt bộ lọc an toàn.

## Thử bằng Shadowrocket

1. Thêm [module Looks Protected P1](https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/locket_cuios_looks_protected.sgmodule). Có thể dùng [bản JS thường](https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/locket_cuios_looks.sgmodule) để kiểm tra tương thích. Chỉ bật một module Locket.
2. Dùng cấu hình HTTPS Decryption/CA đã hoạt động. Kết nối Shadowrocket trước khi mở lại Locket. Đổi module không đảm bảo app đã fetch và activate cấu hình.
3. Mở camera/chụp ảnh và tìm mục filter/Looks. Việc tạo ảnh, nếu xuất hiện, dùng luồng xử lý của chính Locket.
4. Mở `http://cuios-status.invalid/status` rồi xem báo cáo JSON, hai phần `observed.firebase.looks` và `observed.firebase.overlays`.

Nếu chưa hiện Looks, có thể đối chiếu bằng [Looks Native Protected](https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/locket_cuios_looks_native_protected.sgmodule) hoặc [Looks Native JS thường](https://raw.githubusercontent.com/Cuios-shop/locket_cuios_stable/main/locket_cuios_looks_native.sgmodule). Chỉ bật một module. Bản Native không thêm ghi chú và không đổi các entry/menu ghi chú, kể cả khi schema chưa biết. Nó vẫn thử ba cờ filter và giữ cấu hình quay/upload/mic của repo; không phải app Locket hoàn toàn nguyên bản.

`configuration_patched` chỉ xác nhận script đã sửa cấu hình gửi về app. `serverConfigPresent`, `sheetGroups`, `pickerFilters`, `inputFlags` giúp biết đầu vào có cấu hình/danh sách và cờ đang bật hay tắt. Không lưu nội dung prompt, ảnh, ID filter, model, URL hay tài khoản. `generationVerified` luôn là `false` vì script không thể quan sát và chứng minh kết quả tạo ảnh. Xem thêm thời điểm và action của Firebase; dữ liệu chẩn đoán là quan sát đã lưu, không phải trạng thái trực tiếp của app.

Trong `overlays`, `merged` là đã giữ mục gốc và thêm ghi chú; `missing_catalogue_preserved` là thiếu entry nên giữ mặc định; `skipped_schema` là giữ nguyên cấu trúc chưa hiểu; `native_preserved` là bản đối chiếu không sửa menu ghi chú. `addedCaptions` và `observed.firebase.sentCaptions` là số ghi chú thực sự chèn trong response đó. Con số 94 ở phần recipe/trang trạng thái chung là sức chứa bộ ghi chú, không phải xác nhận đang chèn đủ trong bản Looks.

Nếu không có fetch Firebase mới hoặc không xuất hiện Looks, cần kiểm tra log/báo cáo trước khi chỉnh tiếp. Không cần xóa dữ liệu hay cài lại app để thử bản module này. Để quay về, tắt module Looks và bật lại module đang dùng trước đó; Locket vẫn cần fetch/activate lại để cập nhật cấu hình đã lưu.

## Phạm vi phát hành

Các module thử nằm ngay trong repo `Cuios-shop/locket_cuios_stable`, không tạo thêm repo. `argument=looks-aura-frame` hoặc `argument=looks-native` chỉ gắn trên hook response Firebase hiện có. Module thông thường không bật Looks. Cấu hình media 60s/100 MiB, dữ liệu 94 ghi chú với 90 nền và bốn mẫu bản quyền cùng phạm vi URL giữ nguyên. Giới hạn upload thực tế vẫn phải kiểm tra trong app.

Kiểm thử offline chạy cả runtime thường và Protected: bảo toàn catalogue filter/safety, giữ menu gốc trong bản Looks, ghép ghi chú không trùng, bỏ qua schema lỗi, đúng phạm vi request và validator ổn định. Test đối chiếu module thường với 4.0.4 xác nhận hành vi cũ giữ nguyên, chỉ đổi nhãn phiên bản ở URL khung. Chưa kiểm chứng trên iPhone và chưa xác nhận dịch vụ AI chấp nhận tài khoản.
