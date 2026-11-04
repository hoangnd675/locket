# Phân tích nâng cấp v3

Repo nguồn: [Cuongqtx11/locket30s-fixed](https://github.com/Cuongqtx11/locket30s-fixed), commit `6dd3f5dc8c84311f236aaa92af49822ad59b81e5`. Người dùng xác nhận mốc này có mic, quay 60 giây, nhập tối đa 10 giây/6 MB và ghi chú mới. Repo nguồn không được cập nhật.

## Video

Bản nguồn chưa đặt các trường giới hạn byte và chủ yếu đổi duration phẳng. Các giới hạn trong camera_roll.gold hoặc camera_roll.upload.limits có thể còn nguyên. Đây là khả năng từ code, chưa phải schema quan sát trực tiếp trên iPhone.

v3 đặt 60 giây và 104857600 bytes ở các trường được hỗ trợ, chỉ đi qua wrapper media video/upload/recording/trim/limits/free/gold/default, tối đa 4 tầng. Không thay mọi số 10/6291456, cache ảnh, profile hay request upload.

Các key byte chính: max_file_size, max_upload_bytes, max_size_bytes. Alias byte/MB được chỉnh nếu đã có trong object media; key `_ms` là 60000. max_size_mb=100 khác max_size_bytes=104857600. Không sửa max_size thiếu đơn vị.

camera_roll_video_config, camera_roll_video_upload_config và video_upload_config chỉ sửa khi server đã cung cấp object; không tạo schema mới nếu thiếu.

Đã đối chiếu cấu trúc giới hạn file trong camera_roll và ngưỡng 6291456 bytes ở tài liệu cộng đồng. Đây không phải hợp đồng API Locket, cũng không chứng minh có thể nâng trần máy chủ bằng proxy.

Log input library limits chỉ ghi path định sẵn và số trong các field giới hạn đã biết. Nếu vẫn dừng ở 10s/6 MB, cần log/schema đã che dữ liệu riêng. Nếu chọn được đủ nhưng gửi bị từ chối, cần lỗi server thật. Test JSON không chứng minh upload thành công.

## Ghi chú

Thay toàn bộ overlay_items và overlay_dynamic_captions trong picker: 4 thương hiệu ở đầu và 50 mẫu tự viết trong 5 nhóm, ID duy nhất, đăng ký tương ứng. Không sửa caption bài đã đăng.

background.image dùng schema tham khảo từ module gốc và kèm colors dự phòng. PNG được tạo bằng gradient, hình học và hoạ tiết. Client tải ảnh từ chính repo mới; script không thực hiện network call hoặc tải ảnh bên thứ ba.

## Widget

Giữ schema widget_frame_event của bản 2.1 và dùng viền PNG trong suốt có quầng sáng. Không dựng API styles/animation chưa được kiểm chứng. Bản chính dùng Aura; Gold/Rose/no-widget là các module hoàn chỉnh thay thế nhau.

Hiệu ứng tĩnh không ép native widget chạy hoạt ảnh hoặc WidgetKit reload. Chưa xác nhận event/placement below trên mọi kích thước widget. Bản no-widget giữ event cũ trong khi vẫn nâng video/ghi chú.

## Kiểm chứng

29 test logic/asset, gồm 10s/6 MiB ở root/Gold/free/upload/limits; đơn vị byte/MB/ms; bảo toàn codec/dữ liệu ngoài media; ID/thứ tự ghi chú; URL độc lập và log không lộ nội dung riêng.

Không có iPhone kết nối hoặc credentials Locket ở môi trường này. Phần nền hoạt động được ghi nhận từ người dùng; nâng giới hạn và visual mới cần kiểm tra trên thiết bị.
