# Phân tích v4.1.0

## Bằng chứng và điều chưa biết

Người dùng báo v4.0.0 chỉ quay 3s, không mic/âm thanh/ghi chú/picker video. Chưa có report request thật hoặc thiết bị để xác định lớp lỗi. Người dùng xác nhận mục tiêu mới là quay 60s, còn nhập video 10s và 6 MB. Không coi giới hạn này là hợp đồng máy chủ đã được kiểm chứng độc lập.

Trong mã v4.0.0, mọi `camera`, `camera_roll`, upload, trim đều dùng 60s và giới hạn byte 100 MiB. Đây là lỗi cụ thể so với yêu cầu hiện tại. Test hồi quy mới cho thấy bản sửa tách các luồng và không đưa trần byte thư viện vào file quay chung. Việc này chưa chứng minh nguyên nhân hạn quay 3s.

## Cách sửa

`camera` và root `video_config` là ngữ cảnh quay 60s. `camera_roll` và các config upload là nhập 10s/6 MiB. Nhánh `upload`/`trim` chuyển ngữ cảnh sang nhập; `recording` chuyển sang quay; `video`/`free`/`gold`/`limits` giữ ngữ cảnh cha. Tên duration ghi rõ recording giữ 60s; tên ghi rõ upload/camera_roll/trim giữ 10s. Đổi ms chỉ trên tên có hậu tố `_ms`; giữ kiểu số/chuỗi. Các trần file chung không rõ nghĩa được giữ, chỉ giới hạn trong ngữ cảnh nhập hoặc tên explicit upload dùng 6 MiB.

Sửa audio.enabled trong tất cả nhánh media hỗ trợ, giữ codec và format. Không thêm tính năng native bằng JSON. Cờ `mh_mic_enabled_v16` là cờ tương thích kế thừa, chưa được xác minh trên build hiện tại; không suy luận nó có hiệu lực chỉ vì có mặt trong response.

## Mic

[Apple Audio Session Programming Guide](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/RequestingPermission/RequestingPermission.html) yêu cầu quyền trước khi ghi âm và mô tả API do app gọi. [Apple User Guide](https://support.apple.com/en-mide/guide/iphone/iph168c4bbd5/ios) mô tả quản lý quyền trong Privacy & Security. Script proxy không chạy trong tiến trình app, không thay được Info.plist hoặc gọi AVAudioSession của Locket.

Không thấy prompt chưa xác định được nguyên nhân: có thể app chưa đi vào tính năng audio, quyền đã có quyết định trước đó hoặc có hạn chế hệ thống. Cần tình trạng Locket trong danh sách Micrô và request/config thật. Không reset toàn bộ quyền hoặc xin mic từ Safari rồi coi đó là quyền Locket.

## Ghi chú

v4.0 thay `overlay_dynamic_captions` bằng ID tùy biến. v4.1 giữ renderer server và một fallback tên native từ schema cộng đồng, trong khi thay `overlay_items` bằng 54 mẫu. Nền gradient bỏ phụ thuộc ảnh ngoài ở profile mặc định. Đây là phương án thử tương thích, không có bằng chứng parser native đã từ chối danh sách v4.0.

Đã đối chiếu các script công khai bên ngoài để tham khảo cấu trúc camera/camera_roll, feature_gates và static_content. Việc nhiều script dùng cùng một cờ không xác minh được app mới đọc cờ, gọi mic hoặc chấp nhận video dài. Nguồn ban đầu không đọc được bằng GitHub API ở lần kiểm tra đó; lịch sử local đã được giữ để đối chiếu.

## Chẩn đoán và phát hành

Thêm `?view=status`/`?view=report` vào đường mock `https://firebaseremoteconfig.googleapis.com/cuios-check` và host RevenueCat tương ứng, tránh trang `.invalid` không phân giải. Không sửa route config thật từ trình duyệt. Báo cáo chỉ phân loại field, cờ và các giới hạn allowlist; quan sát browser không đánh dấu app đã fetch. Kho 4.1 tách khỏi 4.0 tránh hiển thị record runtime cũ.

44 test offline và CI kiểm tra mã/đường dẫn/artifact/schema mô phỏng. Không có kiểm chứng trên iPhone trong môi trường này. Giữ nguyên artifact v4.0.0 và mọi repo lịch sử; module mới có tên riêng và runtime mới chứa SHA-256 trong tên.
