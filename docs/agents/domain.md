# Tài liệu domain

Cách các skill đọc tài liệu domain của repo này (một context duy nhất).

## Đọc trước khi tìm code

- **`GLOSSARY.md`** ở root: thuật ngữ và tên cần tránh.
- **`docs/SRS_NezFocus.md`**: nguồn sự thật về hành vi. Quyết định nằm ở Mục 0.2 (Decision Log, `DEC-xx`) và Mục 7.6 (ADR); lịch sử thay đổi ở `docs/SRS_v1.2_change_notes.md` (`CR-xx`).
- **Giao diện**: `DESIGN.md`, `docs/design/screens/<khu>.md`, frame trong `Des/nezfocus.pen` (đọc qua MCP của pen.dev).

Repo **không** dùng `docs/adr/`. Quyết định mới ghi vào SRS (dòng `DEC-xx` hoặc `ADR-xx` mới, kèm một CR trong change notes), không tạo file ADR riêng.

## Dùng đúng thuật ngữ

Tên một khái niệm domain (trong tiêu đề issue, tên test, đề xuất refactor) dùng đúng như `GLOSSARY.md` và SRS Mục 1.3. Không dùng từ đồng nghĩa mà glossary đã ghi là tránh (ví dụ "guild"; "server" để chỉ hệ thống phía sau thì gọi là "backend").

Khái niệm chưa có trong glossary: hoặc đang tự đặt tên mà dự án không dùng (xem lại), hoặc là chỗ thiếu thật (thêm vào `GLOSSARY.md` qua `/grill-with-docs`).

## Báo khi mâu thuẫn với quyết định đã có

Đầu ra trái với một `DEC-xx` / `ADR-xx` thì nói rõ, không lặng lẽ làm khác:

> _Trái với DEC-20 (đăng ký bằng email trước), nhưng đáng xem lại vì…_
