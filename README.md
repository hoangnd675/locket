# Cuios v4.1.1 · Quay 60s / Nhập 10s, 6 MiB

## Chuyển sang Organization Cuios.shop

Tên hiển thị là **Cuios.shop**, tên dùng trong URL là **Cuios-shop**. Phiên bản 4.1.1 cập nhật URL module/JS/ảnh sang Organization và nhãn phát hành; giữ logic media, nội dung/nền ghi chú và khung widget. Repo vẫn public để Shadowrocket tải được. Lịch sử và artifact cũ được giữ, không phải tạo lại repo.

## Bản JS làm rối Protected P1

[Module Protected P1](https://raw.githubusercontent.com/Cuios-shop/locket_cuios_10s_6mb/main/locket60s_10s_6mb_protected.sgmodule) có cùng engine, giới hạn video và ghi chú của bản này, dùng artifact làm rối riêng. Chỉ bật một module Locket; thử Protected trên máy trước khi quyết định dùng lâu dài.

Đã chạy lại toàn bộ kiểm thử trên bản Protected trong sandbox. Chưa kiểm chứng trên iPhone. **Đây không phải mã hóa chống sao chép tuyệt đối; repo vẫn public và còn file nguồn dễ đọc/lịch sử.** Ghi chú AI/câu tự nhận không tạo khóa xác thực. Xem [PROTECTED.md](PROTECTED.md) và [AI_NOTICE.md](AI_NOTICE.md).

Repo này lưu riêng nhánh v4.1.0 bắt đầu từ commit `4b3ebce`; bản hiện tại là v4.1.1 sau khi chuyển sang Organization. Engine kế thừa v4.1.0; từ v4.1.1 chỉ cập nhật URL tài nguyên và nhãn phiên bản, nên SHA-256 runtime thay đổi. Module tải runtime từ repo này; các URL artwork trong JS vẫn dùng repo `locket_cuios_stable` được giữ lại.

Bản 60s/100 MiB được người dùng xác nhận hoạt động nằm ở [locket_cuios_stable](https://github.com/Cuios-shop/locket_cuios_stable).

Bản cập nhật theo yêu cầu mới: **quay 60 giây; video từ thư viện tối đa 10 giây và 6 MiB (6.291.456 bytes)**. Giữ 4 ghi chú thương hiệu và 50 mẫu mới. Các repo lịch sử và runtime v4.0.0 đã phát hành không bị sửa.

**Đây là cấu hình mục tiêu và bản thử tương thích. Chưa xác nhận quay đủ 60s, mic/âm thanh, picker video hoặc ghi chú hoạt động trên iPhone.** Người dùng đã báo v4.0.0 vẫn chỉ quay 3s và không có các chức năng đó. Không coi 44 test offline là bằng chứng đã khắc phục lỗi trên máy.

## Cài bản này

Tắt các module Locket khác trong cấu hình đang dùng. Thêm đúng module mới, chỉ bật một module:

```text
https://raw.githubusercontent.com/Cuios-shop/locket_cuios_10s_6mb/main/locket60s_10s_6mb.sgmodule
```

Bật HTTPS Decryption/MITM và CA đã được tin cậy. Bật kết nối Shadowrocket, vuốt đóng Locket rồi mở lại. Không cần gỡ app hay reset quyền riêng tư. Hai tên module cũ trong repo này cũng dùng cùng runtime v4.1.1, nhưng không cài chồng.

## Thay đổi cụ thể

- Tách quay 60s khỏi nhập/cắt video 10s và dung lượng nhập 6 MiB. v4.0.0 đã dùng chung 60s/100 MiB cho hai luồng, không đúng yêu cầu hiện tại.
- Các nhánh upload/trim dùng 10s; recording dùng 60s. Giữ kiểu số/chuỗi số, đơn vị giây/ms, codec, bitrate và các field không rõ nghĩa. Không áp dung lượng thư viện cho giới hạn file quay chung.
- Bật cờ âm thanh có sẵn trong các nhánh media/audio lồng nhau, tắt mute/strip/remove_audio. Các cờ tương thích cũ vẫn chưa phải API được Locket công bố; script không tự gọi được API xin quyền mic của app.
- Danh sách `overlay_dynamic_captions` giữ tên renderer của server, không bị thay toàn bộ bằng 54 ID tự đặt. Đây là thử nghiệm tương thích schema, chưa chứng minh là nguyên nhân ghi chú không hiện.
- 54 ghi chú mới dùng nền gradient mặc định, không phụ thuộc tải ảnh PNG. Giữ khung widget server. Renderer và bố cục vẫn cần kiểm tra trong app. Mã artwork/khung thử nghiệm còn trong repo, không bật ở module này.
- Trang báo cáo mở được qua đường HTTPS trên host thật, không cần tên miền `.invalid`. Kho chẩn đoán mới tách khỏi v4.0.0; báo cáo thêm tên/kiểu cờ media có trong response gốc để phát hiện đổi schema.

**Lỗi dùng chung giới hạn trong mã chưa chứng minh được nguyên nhân app chỉ quay 3s.** Nếu script không chạy/không có fetch hoặc app không activate, đổi giới hạn cũng chưa đủ. Xem [phân tích v4.1](docs/ANALYSIS-v4.1.md).

## Kiểm tra mic và request thực tế

Trong iPhone: **Cài đặt → Quyền riêng tư & Bảo mật → Micrô**. Nếu có Locket nhưng đang tắt, có thể bật lại tại đó. Nếu không có Locket, cần xác định app có đi vào luồng ghi âm hay chưa; không tạo thêm nút mic bằng cấu hình proxy.

Theo [Apple](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/RequestingPermission/RequestingPermission.html), app phải xin và nhận quyền trước khi ghi âm. Trình duyệt xin quyền mic chỉ cấp quyền cho trình duyệt, không cấp cho Locket.

Khi Shadowrocket đang bật, mở Safari:

```text
https://firebaseremoteconfig.googleapis.com/cuios-check?view=status
```

Chỉ trang mang chữ **Cuios**, **v4.1.1** và đúng mục tiêu quay 60s/nhập 10s/6 MiB là kết quả hook mới. Lỗi chứng chỉ, 404/Google hoặc nội dung v4.0.0 không phải thành công. Trang này được script trả cục bộ; không truy vấn account bên ngoài.

Mở Locket, vào camera/thư viện rồi quay lại trang và tải lại. Chọn **Xem báo cáo chẩn đoán**, hoặc mở:

```text
https://firebaseremoteconfig.googleapis.com/cuios-check?view=report
```

Gửi nội dung báo cáo nếu vẫn quay 3s/không mic/không ghi chú. Báo cáo không lưu token, UID, header hay body tài khoản. `deviceFeaturesVerified` luôn là `false` vì proxy không quan sát trực tiếp chức năng native.

| Kết quả | Ý nghĩa |
| --- | --- |
| Không hiện trang Cuios v4.1.1 | Chưa xác nhận đúng runtime/hook/MITM hoạt động |
| HTTPS trình duyệt được, không có request Firebase | Chưa quan sát được Locket fetch qua script; cần đối chiếu cấu hình, app cache hoặc đường mạng |
| `patched` / `partial` | Đã gửi response cấu hình sửa; chưa chứng minh app áp dụng hoặc tính năng chạy |
| `no_entries` / `http_error` / `unexpected_payload` | Server/response chưa thể patch; xem thời gian và mã HTTP |
| Request cũ hơn 5 phút | Chưa chứng minh app vừa fetch mới |

Trang HTTP cũ vẫn hỗ trợ tại `http://cuios-status.invalid/status`; ánh xạ Host cần proxy hỗ trợ. Đường HTTPS phía trên tránh phụ thuộc ánh xạ đó. Quan sát từ Safari luôn tách riêng request của app.

## 54 ghi chú

Bốn mẫu đầu: **mua chứng chỉ Cuios.shop**, **Bản quyền Cuios**, **Cưn🍤**, **tom11th5**. Tiếp theo 50 mẫu tình yêu, vui vẻ, cảm xúc, trêu đùa và dịu dàng. Thay danh sách trong picker, không sửa ghi chú của bài đã đăng. PNG có sẵn để thử artwork tùy chọn; profile mặc định chỉ dùng màu gradient.

## Giới hạn kỹ thuật

Proxy chỉ xử lý response mạng phù hợp. Nó không tự ép SDK gọi fetch/activate, không chạy native AVCapture/AVAudioSession trong Locket, không tự cấp quyền iOS hoặc vượt giới hạn máy chủ. App có thể từ chối response RevenueCat có chữ ký sau khi bị sửa. Không giả mạo chữ ký, đổi bucket, đụng body upload hoặc cấu hình hệ thống máy.

Phần bundle identity, host dự phòng, validator Firebase theo nội dung và fail-open khi lỗi từ v4.0 được giữ. [Phân tích v4.0](docs/ANALYSIS-v4.md) và các tài liệu v2/v3 là lịch sử; giới hạn hiện tại là 60s quay / 10s nhập / 6 MiB.

## Dựng và kiểm thử

Node.js 20+, không dependency:

```bash
python3 tools/build_script.py
python3 tools/build_modules.py
npm run check
npm test
```

44 test: chia giới hạn quay/nhập/cắt; giữ đơn vị/kiểu/schema khác; âm thanh lồng nhau; 54 ghi chú và renderer; HTTPS report/redaction; hồi quy nhận diện/ETag/cache/NO_CHANGE; integrity runtime mới và artifact v4.0.0 bất biến. Kiểm tra thực tế còn cần: clip quay vượt 3s rồi 60s, yêu cầu mic và tiếng sau gửi; nhập clip 10s dưới 6 MiB; thấy 54 ghi chú.

Runtime có tên chứa hash; mọi rule dùng cùng file. `release.json` chứa SHA-256 đầy đủ. Khi đổi logic, tăng version và dựng artifact mới; không sửa file đã phát hành. Mã kế thừa theo MIT.

## Mã nguồn và quyền truy cập

Xem [SECURITY.md](SECURITY.md) để biết kết quả quét, giới hạn của link raw, điều kiện chuyển private và việc JS trên thiết bị vẫn có thể bị sao chép. Hai repo hiện vẫn public để giữ module tải được; chưa có hosting thay thế.
