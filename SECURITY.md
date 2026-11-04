# Cuios · Quyền truy cập mã nguồn và phân phối module

## Kết quả rà soát

Thương hiệu hiện tại và copyright là Cuios / Cuongqtx11. Đã bỏ tên/link tài khoản cá nhân bên ngoài ở tài liệu nghiên cứu cũ trong bản hiện tại và bỏ một assertion nhắc tên tài khoản ngoài trong test. Không thay tên tác giả của phần mã bên ngoài thành tên của chủ repo. Các điều kiện LICENSE vẫn giữ nguyên.

Tên API/vendor và field giao thức không phải tên biến nhận diện tác giả. Những field như `mh_mic_enabled_v16`, `Gold`, `camera_roll`, header RevenueCat/Firebase được giữ để tránh thay đổi khả năng tương thích. Các ghi chú thương hiệu do chủ repo yêu cầu cũng giữ nguyên.

Đã quét bản hiện tại và các text blob trong toàn bộ lịch sử Git có sẵn ở máy, chưa thấy các mẫu token GitHub, khóa AWS hoặc private key được kiểm tra. Đây là kiểm tra theo mẫu, không bảo đảm tìm được mọi loại bí mật. Không ghi giá trị bí mật vào báo cáo hoặc log.

Lịch sử commit và các artifact JS đã phát hành không bị viết lại. Tên/link trong các commit cũ có thể vẫn đọc được khi repo còn public. Bản sao đã được tải trước đây không thể thu hồi bằng việc dọn file hoặc đổi quyền repo.

## Repo private và link module

Hiện chưa chuyển private để giữ đường tải đang dùng hoạt động. Module và ảnh nền hiện tải trực tiếp từ raw.githubusercontent.com. [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#get-repository-content) cho phép đọc không xác thực với tài nguyên public; nội dung private cần quyền đọc tương ứng. URL download được API cấp có thể hết hạn, không phải link phân phối bền vững.

Không nhúng GitHub PAT, token query private hoặc credential tài khoản vào `.sgmodule`, JS, ảnh hay URL chia sẻ. Người nhận module có thể đọc lại chúng. GitHub Free cũng không cung cấp Pages từ repo private theo [tài liệu Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Phương án triển khai: hai repo nguồn private; bản JS phát hành và ảnh được triển khai sang một hosting riêng. Server giữ khóa riêng và chỉ cấp file theo quyền truy cập. Người dùng phải chuyển sang link phát hành mới và kiểm tra trước khi đóng quyền public của repo nguồn. Hosting/key chưa được cung cấp nên bước đổi quyền này chưa thực hiện.

Ngay cả khi nguồn phát triển private, JS đã cấp cho Shadowrocket vẫn có thể bị người nhận lưu và phân tích. Minify/obfuscation chỉ tăng công đọc, không phải mã hóa chống sao chép tuyệt đối. Việc gắn watermark hoặc đổi tên biến cũng không hạn chế quyền truy cập file.

## Giấy phép

Repo hiện dùng MIT, copyright Cuongqtx11. [MIT](https://opensource.org/license/mit) cho phép sao chép/sửa/phân phối với điều kiện giữ thông báo copyright và permission. Chuyển private không thu hồi các quyền đã cấp cho bản sao trước đó. Đổi thương hiệu không biến phần mã kế thừa thành phần sở hữu độc quyền. Không tự đổi hoặc xóa điều kiện giấy phép để tạo cảm giác đã chặn sao chép.

## Kiểm tra trước khi commit

```bash
python3 tools/audit_repository.py
python3 tools/audit_repository.py --history
```

CI chạy quét bản hiện tại. Các text blob lịch sử chỉ được quét đầy đủ khi checkout có đủ lịch sử. Báo cáo xuất số lượng và vị trí, không xuất giá trị khớp. Thư mục private-dist, security-reports, file bundle và một số định dạng chứng chỉ/khóa đã được thêm vào gitignore. Không có file token/credential mới được tạo trong repo.

Nếu một token thật từng được gửi qua chat hoặc xuất hiện công khai, cần thu hồi token đó trong tài khoản phát hành và tạo credential mới có phạm vi nhỏ hơn; xóa chữ khỏi file không vô hiệu hóa token.

## Protected P1

Đã thêm bản phân phối làm rối và ghi chú quyền tác giả trung thực tại [PROTECTED.md](PROTECTED.md). Giữ nguồn dễ đọc và giấy phép, không tạo mật khẩu AI hoặc đổi quyền repo. Mã làm rối vẫn có thể được phân tích và người có link vẫn tải được. Đây là biện pháp tăng công đọc, không thay thế quyền truy cập server.
