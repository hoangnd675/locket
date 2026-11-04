# Cuios · Protected P1

Đây là **bản phân phối JS làm rối**, chạy bằng JavaScript thông thường. Không phải AES, không có khóa bí mật tách khỏi thiết bị và không chống phân tích tuyệt đối.

**Repo vẫn public và vẫn có file nguồn dễ đọc cùng lịch sử cũ.** Protected chỉ làm khó đọc file phân phối mới; không giấu được bản nguồn công khai. Muốn giấu nguồn phát triển cần repo private và đường phát hành phù hợp như mô tả trong SECURITY.md. Không thu hồi được bản sao đã tải.

## Kỹ thuật và tương thích

- Đổi tên nội bộ, che bảng chuỗi bằng cơ chế RC4 của công cụ, trộn/chuyển chỉ mục và thêm wrapper cho truy cập chuỗi.
- Biến đổi luồng điều khiển, biểu thức số, một phần mã giả và key object; không đổi tên field giao thức hoặc biến `$request`, `$response`, `$done`, `$argument`, `$persistentStore`.
- Giữ hàm băm validator chuẩn ở dạng nhẹ vì nó duyệt từng ký tự của cấu hình. Làm rối vòng này đã khiến bản thử chậm; phép kiểm tra tương đương xác nhận kết quả không đổi.
- Catalogue JSON được đóng gói thành một giá trị trước khi làm rối để tránh hàng nghìn lời gọi giải mã riêng. Không có source map; không có mật khẩu chủ sở hữu hoặc khóa tài khoản trong artifact.
- Không dùng API obfuscation từ xa. Compiler và dependency được khóa phiên bản; audit dependency công cụ lúc kiểm tra không ghi nhận lỗ hổng. File gốc/release bình thường được giữ nguyên.

RC4 ở đây là lớp che chuỗi có decoder đi kèm JS, **không phải cơ chế bảo mật dữ liệu hiện đại hoặc kiểm soát quyền tải**. Seed sinh từ hash nguồn chỉ để dựng lại được cùng bản, không phải secret. Không tuyên bố chặn AI giải mã.

## Ghi chú và giấy phép

Xem AI_NOTICE.md. File JS chứa thông báo Cuios/Cuongqtx11 và nguyên điều kiện MIT. Điều kiện build tool được giữ trong `tools/obfuscation/BUILD_TOOL_LICENSE.txt` và header artifact. Không thêm tuyên bố pháp luật hoặc độc quyền mâu thuẫn với giấy phép hiện có.

## Kiểm thử

Toàn bộ bộ kiểm thử hiện có được chạy hai lần: trên engine chuẩn và trên engine protected. Cả hai chạy trong sandbox không có DOM, timer, Node API hoặc quyền sinh mã động. Kiểm tra thêm hash nguồn/artifact, module giữ nguyên rule/argument, `$done` đúng một lần, cùng output media/caption/header, thông báo giấy phép và không có source map.

Script được kiểm tra dưới budget 1 giây mỗi lần thực thi trên máy build. Benchmark chỉ là Node sandbox trên máy này, không phải kết quả iPhone. Cần thử bản Protected trên Shadowrocket; không hứa mọi phiên bản JavaScriptCore xử lý giống Node.

```bash
npm test
npm run test:protected
node tools/benchmark_protected.cjs
```

## Dựng lại

```bash
npm ci --prefix tools/obfuscation --ignore-scripts --no-audit --no-fund
npm run build:protected
npm test
npm run test:protected
```

`protected-release.json` ghi checksum file nguồn, artifact, compiler, module và giới hạn xác nhận. Artifact được lưu trong scripts/protected với tên chứa hash. Không sửa đè artifact đã phát hành. Khi sửa source/release chuẩn, cần dựng lại bản Protected tương ứng trước khi kiểm thử/phát hành. `--probe` chỉ lưu candidate chưa kiểm chứng vào private-dist và không tạo module phát hành.
