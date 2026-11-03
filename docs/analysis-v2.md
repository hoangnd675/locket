> Tài liệu lịch sử kế thừa từ repo gốc; xem README và UPGRADE-v3.md cho bản hiện tại.

# Phân tích nâng cấp 60 giây, thư viện, ghi chú và âm thanh

## Thông tin đã có

- Người dùng xác nhận dùng Shadowrocket và quay được 15 giây với bản đầu.
- Chưa có phiên bản Locket/iOS, URL request Firebase thực tế hoặc log script trên thiết bị. Chưa biết app dừng quay ở 15 giây hay chỉ giới hạn khi gửi.
- Bản v1 đặt một số trường camera/camera_roll về 30, thiếu cờ âm thanh và một số cờ thư viện, không thêm ghi chú.
- Có thể tái hiện logic patch bằng Node.js; không có iPhone kết nối để kiểm chứng camera, mic, picker, encoder hoặc upload.

Vì vậy, chưa thể kết luận nguyên nhân giới hạn 15 giây đã được sửa. v2 cung cấp cấu hình 60 giây đồng bộ hơn và dấu hiệu log để xác định nó có chạy hay không.

## Nguồn và mức độ chắc chắn

| Nguồn | Điều quan sát được | Điều không chứng minh |
| --- | --- | --- |
| [Firebase iOS Remote Config](https://firebase.google.com/docs/remote-config/ios/get-started) | SDK quản lý fetch/activate, giá trị mặc định và khoảng thời gian fetch | `Cache-Control: no-store` đủ xoá cache trong SDK |
| [Apple: quyền truy cập phần cứng](https://support.apple.com/en-ie/guide/iphone/iph168c4bbd5/27/ios/27) | Camera/microphone cần quyền do người dùng cấp cho app | Script proxy có thể cấp quyền iOS hoặc thay đổi AVAudioSession |

Tài liệu đối chiếu bên ngoài chỉ được dùng để tham khảo cấu trúc camera/camera_roll, cờ media và schema overlay. Đây không phải hợp đồng API hay kiểm chứng của Locket. Bản hiện tại có phần triển khai kế thừa và phần được viết lại; tên thương hiệu không xác lập quyền sở hữu độc quyền đối với phần kế thừa.

## Các thay đổi cụ thể

### Thời lượng và nhập video

Đặt cùng mục tiêu 60 giây cho camera, camera_roll, giới hạn chọn/cắt/upload ở entries và các trường đã biết trong video_config nếu server có object đó. Các alias phổ biến như recording_duration và video_upload_max_duration cũng đồng bộ về 60 để tránh một trường vẫn giữ 15/30/45/90.

Giá trị bên trong object media là số; giá trị Remote Config ngoài cùng là chuỗi. Chỉ những key có hậu tố `_ms` cụ thể và đã có trong object mới được đặt 60000. Không suy luận đơn vị từ độ lớn giá trị, không đổi schema Android và không quét/thay mọi số 15 trong response. Không tự dựng video_config khi chưa biết cấu trúc của phiên bản app.

Bật feature gates liên quan tới video, thư viện và upload. Các key/cờ tham khảo có thể bị bỏ qua nếu phiên bản Locket không đọc chúng. Không thay codec, bitrate, CDN, storage bucket, giới hạn byte hoặc request upload.

### Âm thanh

Bật `video_sound_enabled`, `microphone_enabled`, `camera_microphone_enabled`. Nếu các object camera/camera_roll/video_config đã có cờ boolean hoặc chuỗi boolean như muted, strip_audio hay preserve_audio, điều chỉnh chúng để yêu cầu giữ âm thanh. Giữ trường codec và nội dung audio không liên quan.

Không tự thêm schema audio mới. Không ép `audio_session_deactivation_enabled` vì chưa biết tác dụng trong phiên bản Locket thực tế. Nếu client không triển khai thu/giữ âm thanh hoặc encoder bỏ audio track, response patch không thể bổ sung phần triển khai đó.

### Ghi chú

Thêm 20 mẫu static_content tự viết bằng màu/emoji và 12 loại native tham khảo nếu ID chưa tồn tại. Giữ toàn bộ nhóm/ghi chú server, bao gồm phiên bản của server khi trùng ID. Áp dụng lại không thêm bản sao. Entry JSON hỏng giữ nguyên, không làm mất ghi chú cũ.

Các mẫu chữ không tải tài nguyên bên ngoài. Nhạc, vị trí, thời tiết, thăm dò và các loại native khác vẫn cần renderer/dịch vụ tương ứng trong app.

### Cache và phiên bản

Giữ URL module cũ, thêm URL locket60s.sgmodule và version query cho script. Log Firebase chứa phiên bản và cấu hình mục tiêu, không chứa UID/header/body. Xoá HTTP conditional-cache header của request được nhận diện và đặt no-store cho response đã sửa khi runtime cung cấp headers.

Không giả timestamp/templateVersion máy chủ và không tạo một cấu hình không đầy đủ từ response NO_CHANGE thiếu entries. SDK có thể chưa gửi request mới dù đã tải lại module; chỉ log Firebase v2 xác nhận handler đã chạy. Log không xác nhận app đã activate hoặc server đã chấp nhận video.

## Cách phân biệt lỗi còn lại

| Hiện tượng | Nhánh cần kiểm tra tiếp |
| --- | --- |
| Không có log Firebase v2 | Module/script cache, MITM, rule trùng, request không khớp URL hoặc app chưa fetch |
| Có log v2 nhưng camera vẫn dừng ở 15 giây | App chưa activate config, key khác, schema khác hoặc giới hạn native; cần phiên bản và cấu trúc config đã che dữ liệu riêng |
| Camera được 60 nhưng picker cắt 15 | Giới hạn chọn/cắt riêng trong native hoặc key chưa nhận diện |
| Preview 60 nhưng gửi lỗi | Encoder, kích thước, định dạng hoặc server validation; cần mã lỗi thật |
| Preview có tiếng nhưng người nhận không nghe | Mute khi phát, encoder/upload bỏ track hoặc xử lý media phía server |
| Camera không có tiếng nhưng Photos có tiếng | Quyền Microphone, audio session hoặc logic thu âm trong app |

Kiểm tra riêng clip quay trong app và clip từ Photos ở 10/20/60 giây, cả trước khi gửi và sau khi người nhận mở. Không tuyên bố đạt 60 giây có tiếng chỉ dựa vào nội dung JSON hoặc test offline.
