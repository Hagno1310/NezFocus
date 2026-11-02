# 05 · Việc cần làm

Tab Việc: mọi việc của mình từ mọi server, chi tiết một việc (Assignee, Lịch sử Task), thêm / sửa việc.

- Hành vi: SRS v1.9 Mục 3.1 (Tab Việc cần làm), 3.5, 3.6 UF-06/UF-08, 7.3.2, 8.4.4, REQ-STUDY-06, REQ-STUDY-08, REQ-NOTIF-02, REQ-NOTIF-05 (mục `task_assigned` / `task_reminder` / `task_unassigned`), DEC-40, DEC-41.
- Component: [00-components.md](00-components.md) — `TaskRow` (C-12), `MemberRow` (C-28), `SegmentedControl` (C-20), `ScreenHeader` (C-22), `TextField` / `SearchField` (C-02), `Checkbox` (C-23), `ActionSheet` (C-09). Nhìn thế nào: [DESIGN.md](../../../DESIGN.md) (chế độ **Operate**).
- Hành vi chốt 19/10/2026 khi viết spec này: nhóm "7 ngày tới" thay "Tuần này"; nhóm "Đã xong" (7 ngày gần nhất — **thay bằng "giữ mọi việc" ở v1.9**); đổi trạng thái tự do, chạm ô ở danh sách = Xong kèm Hoàn tác; hạn mặc định 23:59, không đặt hạn đã qua; chỉ thêm việc từ Task Board; dòng phụ = hạn · tên server; trùng hạn xếp theo thời điểm tạo; chọn người: "Tôi" đầu, ẩn tài khoản chờ xóa; thao tác theo vai trò; Lịch sử mới nhất trên cùng (3 dòng + xem toàn bộ); offline vào outbox.
- **(v1.9, CR-20, CR-21)** Hạn ở danh sách luôn có giờ; hàng Xong ghi lúc xong; đổi trạng thái gửi ngay, Hoàn tác là một lần đổi mới (DEC-41 sửa); nhóm Đã xong giữ mọi việc, 50 việc / lần (DEC-40 sửa); tìm việc theo tiêu đề; nhấn giữ hàng mở menu; hàng Người tạo ở chi tiết; mở chi tiết từ mục `task_assigned` của hộp thư (06).
- Nhãn UI: tab "Việc", tiêu đề "Việc cần làm" (README › Thuật ngữ). Trạng thái task: "Cần làm" / "Đang làm" / "Xong" (cùng nhãn nhóm của Task Board ở 02 › S-HOME-03).

## Quy ước chung của khu vực

| Hạng mục | Quy ước |
|---|---|
| Khung | 390 × 844; kiểm thêm 360 × 800 cho S-TASK-01 `default` và S-TASK-02 `assignee` |
| Vị trí | S-TASK-01 là màn gốc của tab **Việc** (`TabBar`, Việc đang chọn; tiêu đề `title-1` trong thân, không header — giống tab Học). S-TASK-02/03 là màn con: `ScreenHeader` (C-22), vẫn có `TabBar` của tab đang mở (Việc, hoặc Home khi mở từ Task Board) |
| Badge tab Việc | Số task **quá hạn + hạn hôm nay** chưa xong trong danh sách Việc cần làm (SRS 3.1, C-03) |
| Thời gian | (Thống nhất 22/10/2026; sửa v1.9, CR-20.) Hạn = **phần ngày · giờ**, ở danh sách, S-TASK-02 và S-TASK-03 đều **luôn có giờ** `HH:mm`. Phần ngày (tương lai): hôm nay "Hôm nay" · ngày mai "Ngày mai" · trong 7 ngày "Thứ 6, 23/10" · xa hơn "05/11" · **năm chỉ ghi khi khác năm hiện tại** ("05/01/2027"; không bao giờ "23/10/2026"). Ví dụ: "Hôm nay · 21:00" · "Ngày mai · 23:59" · "Thứ 6, 23/10 · 23:59" · "05/11 · 23:59" · "05/01/2027 · 09:00". Dấu phẩy chỉ nằm giữa thứ và ngày, không nằm trước giờ. Dòng phụ ở danh sách = "{hạn} · {server}" ("Hôm nay · 21:00 · Ôn thi Giải tích 2"). **Quá hạn:** "Quá hạn · 16/10 · 23:59"; quá hạn trong hôm nay "Quá hạn · Hôm nay · 19:00" (icon `alarm-clock-off`, `danger`). **Việc Xong không bao giờ "Quá hạn":** dòng phụ icon `check` + "Xong · {ngày} · {giờ}" theo lúc xong ("Xong · Hôm nay · 20:12", "Xong · 15/10 · 21:40"; năm khi khác năm) thay cho hạn; hạn của việc Xong chỉ còn ở hàng Hạn của S-TASK-02 (không `danger`). Ngày đã qua (quá hạn, lúc xong): "Hôm nay" hoặc "dd/MM", không dùng thứ. Việc không có hạn: dòng phụ và hàng Hạn ở S-TASK-02 ghi "Không hạn"; hàng Hạn trong form S-TASK-03 ghi "Chưa đặt". **Dòng phụ một dòng:** thiếu chỗ (khung 360) thì cắt **tên server** "…" trước, phần hạn / "Xong · …" không bao giờ bị cắt; 200% xuống dòng như Edge `large-text-list`. Theo timezone của user. (Mục hộp thư ở 06 ghi kiểu tuyệt đối "Hạn 18/10 · 21:00" — xem 06) |
| Thứ tự trong nhóm | (REQ-STUDY-08, ghi rõ 22/10/2026) Mọi nhóm theo hạn — kể cả **Quá hạn** — xếp **hạn tăng dần**: việc trễ lâu nhất đứng đầu nhóm Quá hạn. Trùng hạn: việc tạo trước đứng trước. Không hạn: theo thời điểm tạo, cũ trước. Đã xong: mới xong trên cùng |
| Màu ngữ nghĩa | `danger` cho quá hạn (icon + chữ), `success` cho ô trạng thái Xong; không dùng màu pha |
| Mascot | **Không** (DESIGN.md › Mascot: không bao giờ trong Việc cần làm), kể cả empty state |
| Toast | Trên `TabBar` |
| Dữ liệu nhất quán | Mỗi việc thuộc đúng một nhóm theo hạn (nhóm trống thì ẩn). Badge tab Việc = số việc ở nhóm Quá hạn + Hôm nay (mẫu: 1 + 2 = **3**, khớp badge "3" đã có trên mọi frame của 02, 03, 04). Việc "Chưa giao" chỉ hiện với người tạo. Lịch sử ghi đúng thứ tự thời gian và khớp trạng thái **và Assignee** hiện tại (mỗi Assignee có một dòng "đã tự nhận việc" hoặc "{Tên} đã thêm …"). Mỗi dòng "{Tên} đã thêm bạn" trong 90 ngày khớp một mục `task_assigned` ở hộp thư 06 (mẫu: "Bình đã thêm bạn" hôm qua 21:40 ở "Nộp báo cáo giữa kỳ" ↔ "Bình giao cho bạn: Nộp báo cáo giữa kỳ" · "Hạn 20/10 · 23:59"). Lịch sử gọi **người đang xem** là "Bạn" (đầu câu) / "bạn" (giữa câu), người khác gọi bằng tên: An xem → "Bình đã thêm bạn"; Bình (người tạo) xem cùng việc → "Bạn đã thêm An" (ghi 22/10/2026). Ngày mẫu: **Chủ Nhật 18/10/2026, 20:12** |
| Dữ liệu mẫu | Việc của An: **Quá hạn** "Sửa lỗi đăng nhập" (Nhóm đồ án Mobile · `#viec-nhom`, hạn 16/10 23:59, An + Dũng, Đang làm, Dũng tạo) · **Hôm nay** "Đọc tài liệu chương 5" (Ôn thi Giải tích 2 · `#viec-nhom`, hạn 21:00, An, An tạo) và "Ôn chương 4 — tích phân bội" (Ôn thi Giải tích 2, hạn 23:00, An + Chi, Chi tạo) · **7 ngày tới** "Nộp báo cáo giữa kỳ" (Ôn thi Giải tích 2, Thứ 6 23/10 23:59, An + Bình, **Bình tạo** — cùng việc ở Task Board 02) · **Sau đó** "Chuẩn bị demo cuối kỳ" (Nhóm đồ án Mobile, 05/11 23:59, An + Chi + Dũng + Giang + Hà, Dũng tạo — hàng hiện 3 avatar + "+2") · **Không hạn** "Làm slide thuyết trình" (Ôn thi Giải tích 2, Chưa giao, An tạo) · **Đã xong — 3** (v1.9; mới xong trên cùng): "Tóm tắt chương 3 — đạo hàm riêng" (Ôn thi Giải tích 2 · `#viec-nhom`, xong 17/10 22:05), "Đặt phòng thư viện cho buổi ôn" (Ôn thi Giải tích 2 · `#viec-nhom`, xong 16/10 09:30) — hai việc này cũng là hai hàng Xong đầu ở Task Board của 02 S-HOME-03 (rà 31/10/2026), "Thiết kế màn hình đăng nhập" (Nhóm đồ án Mobile, hạn 15/10 23:59, xong 15/10 21:40). Ở mọi việc do người khác tạo, An **tự nhận** ("Tôi làm"), trừ "Nộp báo cáo giữa kỳ" (Bình thêm An hôm qua 21:40) — nên hộp thư mẫu 06 chỉ có một mục `task_assigned` (ghi 30/10/2026 để hai area khớp) |

---

## S-TASK-01 · Việc cần làm

**Mục đích:** biết hôm nay phải làm gì, việc nào trễ, ở mọi server.
**REQ:** STUDY-08, STUDY-06 (tìm việc, nhấn giữ), SRS 3.1, 3.5, 7.3.2.
**Mở từ:** `TabBar` › Việc. **Đi tới:** S-TASK-02 (chạm hàng), S-TASK-03 `edit` và S-TASK-02 `delete-confirm` (menu nhấn giữ), S-HOME-01 của kênh gốc (từ S-TASK-02).

### Bố cục
```
┌ Status bar ──────────────────────────────┐
│ Việc cần làm                         [🔍] │  title-1 · IconButton search (v1.9)
│ [Tất cả] [Ôn thi Giải tích 2] [Nhóm đồ…] │  chip lọc server, cuộn ngang
│ QUÁ HẠN — 1                              │  tiêu đề nhóm, label 600
│ (◐) Sửa lỗi đăng nhập          (A)(D)    │  TaskRow (C-12)
│     ⏰ Quá hạn · 16/10 · 23:59 · Nhóm đồ án Mobile│
│ HÔM NAY — 2                              │
│ (○) Đọc tài liệu chương 5         (A)    │
│     📅 Hôm nay · 21:00 · Ôn thi Giải tích 2│
│ (○) Ôn chương 4 — tích phân bội  (A)(C)  │
│     📅 Hôm nay · 23:00 · Ôn thi Giải tích 2│
│ 7 NGÀY TỚI — 1                           │
│ (○) Nộp báo cáo giữa kỳ          (A)(B)  │
│     📅 Thứ 6, 23/10 · 23:59 · Ôn thi Giải…│
│ SAU ĐÓ — 1                               │
│ (○) Chuẩn bị demo cuối kỳ (A)(C)(D) +2   │
│     📅 05/11 · 23:59 · Nhóm đồ án Mobile  │
│ KHÔNG HẠN — 1                            │
│ (○) Làm slide thuyết trình    Chưa giao  │
│ ▸ ĐÃ XONG — 3                            │  nhóm thu gọn, cuối danh sách
├ TabBar (Việc ③) ─────────────────────────┤
```

### Component
`TaskRow` (C-12, dòng phụ: hạn · tên server), `FilterChip` (C-30, mới — dùng chung với chip thiết lập lời mời ở 02 › S-HOME-07), tiêu đề nhóm, `IconButton` `search` + `SearchField` + `Button · text` "Hủy" (v1.9), `ActionSheet` (menu nhấn giữ, v1.9), `EmptyState · inline`, `Skeleton`, `Banner`, `Toast`, `TabBar`.

### Nội dung chữ
| Vị trí | Chữ |
|---|---|
| Tiêu đề | "Việc cần làm" · `IconButton` `search` bên phải (`accessibilityLabel` "Tìm việc"); ẩn ở `empty` |
| Nhóm | "QUÁ HẠN — 1" · "HÔM NAY — 2" · "7 NGÀY TỚI — 1" · "SAU ĐÓ — 1" · "KHÔNG HẠN — 1" · "ĐÃ XONG — 3" |
| Chip lọc | "Tất cả" + tên từng server có việc trong danh sách (cắt `…`) |
| Tìm (v1.9, CR-20 #8) | `SearchField` "Tìm việc theo tên" thay tiêu đề, `Button · text` "Hủy" bên phải; nhóm kết quả "ĐANG LÀM — n" · "CẦN LÀM — n" · "XONG — n" (nhóm rỗng ẩn; XONG mở sẵn, mới xong trên cùng, 50 / lần + "Xem thêm"). Không có kết quả: "Không có việc nào khớp “{từ khóa}”" · "Thử từ khóa khác." (đang lọc server: "Đang tìm trong {server}. Chọn Tất cả để tìm ở mọi server."). Offline: dòng `label` "Đang offline · chỉ tìm trong việc đã lưu trên máy" dưới ô tìm |
| Menu nhấn giữ (v1.9, CR-20 #10) | Tiêu đề = tên việc (1 dòng, cắt "…"); nhóm "TRẠNG THÁI": "Cần làm" · "Đang làm" · "Xong" (ô trạng thái nhỏ như C-12 bên trái, `check` `primary` bên phải ở trạng thái hiện tại) · "Sửa" (`pencil`) · "Sao chép link việc" (`link`) · "Xóa việc" (`trash-2`, `danger`) |
| Toast | "Đã xong · Hoàn tác" · "Đã mở lại · Hoàn tác" · "Đã chuyển sang Đang làm · Hoàn tác" · "Đã chuyển sang Cần làm · Hoàn tác" · "Đã sao chép link việc" · 500 việc: "Kênh đã có 500 việc chưa xong. Đánh dấu xong hoặc xóa bớt rồi mở lại." (không Hoàn tác) |
| Nhóm Đã xong mở | Sau 50 việc: `Button · text` "Xem thêm" căn giữa (offline: `disabled`) |

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|
| `default` | Như bố cục | |
| `loading` | Lần đầu, chưa có cache: 6 `Skeleton` hàng task | |
| `empty` | Không có việc nào: `EmptyState · inline` (không mascot) giữa vùng danh sách; ẩn chip lọc và nút tìm | "Chưa có việc nào" · "Việc được giao cho bạn ở các kênh có Task Board sẽ hiện ở đây." |
| `all-done` | Còn việc đã xong, không còn việc chưa xong; nút tìm vẫn có | "Xong hết rồi" · "Không còn việc nào cần làm." + nhóm "ĐÃ XONG — 3" (thu gọn) bên dưới |
| `offline` | `Banner · offline` dưới tiêu đề; danh sách lần đồng bộ gần nhất; đổi trạng thái vẫn được (outbox), hàng đang chờ gửi mờ 50% | "Bạn đang offline" (STUDY-08 AC3) |
| `filter-server` | Chip "Nhóm đồ án Mobile" đang chọn: chỉ việc của server đó, dòng phụ bỏ tên server ("Quá hạn · 16/10 · 23:59", "05/11 · 23:59"). Hàng chip giữ ở đầu (thấy "Tất cả") nếu chip đang chọn vừa trọn trong màn; nếu không, cuộn vừa đủ để chip đang chọn hiện trọn, cách mép phải 16 (mẫu: chip "Nhóm đồ án Mobile" rộng 162 không vừa ở vị trí đầu, nên "Tất cả" bị cắt một phần) | |
| `done-expanded` | Nhóm "ĐÃ XONG — 3" mở (mọi việc đã xong, không còn mốc 7 ngày — DEC-40 sửa): mới xong trên cùng, mỗi hàng ô tick xanh, tiêu đề gạch ngang, dòng phụ "Xong · 17/10 · 22:05 · Ôn thi Giải tích 2" / "Xong · 16/10 · 09:30 · Ôn thi Giải tích 2" / "Xong · 15/10 · 21:40 · Nhóm đồ án Mobile". 3 việc (≤ 50) nên không có "Xem thêm" — "Xem thêm" vẽ ở Edge `many-done` | |
| `marked-done` | Vừa chạm ô trạng thái của "Đọc tài liệu chương 5": thay đổi **đã gửi ngay** (DEC-41 sửa); hàng gạch ngang, dòng phụ đổi thành "Xong · Hôm nay · 20:12 · Ôn thi Giải tích 2", `Toast` "Đã xong · Hoàn tác" (6 giây); hàng chuyển xuống nhóm Đã xong khi toast ẩn (luật hiển thị); badge tab Việc giảm (3 → 2) | "Hoàn tác" → gửi lại trạng thái trước lần chạm (Cần làm) |
| `marked-doing` 🆕 | (v1.9) Chọn "Đang làm" ở menu nhấn giữ của "Đọc tài liệu chương 5": chỉ ô trạng thái đổi sang nửa đặc, hàng ở nguyên nhóm HÔM NAY (Việc cần làm xếp theo hạn); badge giữ 3 | `Toast` "Đã chuyển sang Đang làm · Hoàn tác" |
| `reopened` | (chốt 19/10/2026) Chạm tick xanh của "Thiết kế màn hình đăng nhập" (hạn 15/10 23:59) trong nhóm Đã xong (đang mở): ô về rỗng, hết gạch ngang, dòng phụ "Quá hạn · 15/10 · 23:59 · Nhóm đồ án Mobile" (`danger`), `Toast` "Đã mở lại · Hoàn tác"; khi toast ẩn hàng về nhóm Quá hạn; badge tab Việc tăng (3 → 4). Hai hàng Xong còn lại giữ "Xong · …" | |
| `search` 🆕 | (v1.9) Chạm 🔍 → `SearchField` thay tiêu đề, gõ "chuong" (không dấu), `OS/Keyboard · text` (phím "Tìm"); hàng chip lọc giữ ("Tất cả" đang chọn). Kết quả thay danh sách: "CẦN LÀM — 2": "Đọc tài liệu chương 5" (Hôm nay · 21:00 · Ôn thi Giải tích 2), "Ôn chương 4 — tích phân bội" (Hôm nay · 23:00 · Ôn thi Giải tích 2); "XONG — 1" (mở sẵn): "Tóm tắt chương 3 — đạo hàm riêng" (Xong · 17/10 · 22:05 · Ôn thi Giải tích 2). Không tô phần khớp; nhóm ĐANG LÀM rỗng nên ẩn | "Hủy" → xóa từ khóa, về danh sách thường |
| `search-empty` 🆕 | (v1.9) Chip "Nhóm đồ án Mobile" đang chọn, gõ "de cuong": `EmptyState · inline` (không mascot) dưới hàng chip; bàn phím mở | "Không có việc nào khớp “de cuong”" · "Đang tìm trong Nhóm đồ án Mobile. Chọn Tất cả để tìm ở mọi server." |
| `row-menu` 🆕 | (v1.9) Nhấn giữ "Nộp báo cáo giữa kỳ" (An là Owner của Ôn thi Giải tích 2 nên đủ mọi mục): hàng nhấc lên trên scrim (như S-HOME-04), `ActionSheet` tiêu đề "Nộp báo cáo giữa kỳ"; "TRẠNG THÁI": Cần làm (✓) · Đang làm · Xong; "Sửa"; "Sao chép link việc"; "Xóa việc" (`danger`) | Rung nhẹ khi mở |

Không áp dụng: `error` (luôn có cache; lỗi tải lại dùng `Toast` "Không tải được việc mới · Thử lại" khi kéo làm mới), `forbidden` (chỉ hiện việc mình còn xem được), `os-permission`.

### Tương tác
- Chạm hàng → S-TASK-02. Chạm ô trạng thái: ô rỗng / nửa đặc → Xong, tick xanh → mở lại về Cần làm (C-12; không quyền thì ô không bấm được). Thay đổi **gửi ngay**; "Hoàn tác" (6 giây) là một lần đổi mới về trạng thái trước lần chạm (kể cả "Đang làm"), Lịch sử ghi cả hai dòng ("Bạn đã đổi trạng thái Đang làm → Xong", rồi "Xong → Đang làm") (DEC-41 sửa). Kéo xuống để làm mới (SRS 3.4).
- **Nhấn giữ hàng** (v1.9) → `row-menu`. Chỉ hiện mục người xem làm được: TRẠNG THÁI khi được đổi trạng thái; "Sửa" và "Xóa việc" cho người tạo / `MANAGE_TASKS`; "Sao chép link việc" luôn có (chép `https://nezfocus.app/tasks/<id>`, Toast "Đã sao chép link việc"). "Sửa" → S-TASK-03 `edit`; "Xóa việc" → S-TASK-02 `delete-confirm`. Đổi trạng thái từ menu giống chạm ô (gửi ngay, có Hoàn tác): ở Việc cần làm chỉ ô trạng thái đổi; chọn Xong thì hàng vẫn sang Đã xong khi toast ẩn. Hàng `pending` / lưu thất bại giữ luật cũ (nhấn giữ → "Xóa bản nháp"). TalkBack: các mục của menu là `accessibilityActions` của hàng.
- **Tìm** (v1.9): tìm sau khi ngừng gõ 300 ms, từ 1 ký tự, không phân biệt dấu và hoa thường ("đ" = "d"); kết hợp chip lọc server; gồm cả việc đã xong. Đổi chip khi đang tìm thì kết quả lọc lại theo chip.
- Danh sách không tự xếp lại khi đang xem, trừ hàng vừa đánh dấu Xong / mở lại (sau khi toast ẩn).

### Checklist duyệt
- [ ] 13 state; `default` cả hai theme và khung 360 (dòng phụ dài nhất "Quá hạn · 16/10 · 23:59 · Nhóm đồ án Mobile" cắt tên server, phần hạn còn đủ). Trên canvas: các state chính trước, bản sáng và 360 ở cuối hàng. `done-expanded` và `reopened` vẽ ở vị trí đã cuộn xuống cuối danh sách.
- [ ] Mọi hạn ở danh sách có giờ; hàng Xong ghi "Xong · …", không bao giờ "Quá hạn".
- [ ] Badge tab Việc = Quá hạn + Hôm nay (= 3).
- [ ] Nút 🔍 có ở mọi state trừ `empty`.
- [ ] Không mascot; quá hạn đọc được không cần màu.

---

## S-TASK-02 · Chi tiết việc

**Mục đích:** xem đủ thông tin một việc, nhận việc, đổi trạng thái, xem lịch sử.
**REQ:** STUDY-06 (AC7, AC9, AC10; Task detail có Người tạo — v1.9), STUDY-08, NOTIF-05, UF-06, UF-08.
**Mở từ:** S-TASK-01 (TabBar sáng tab Việc); S-HOME-03 `task-board` (cùng màn hình, TabBar sáng tab Home, Back về kênh với drawer phải mở ở mục Task); mục hộp thư 06 `task_assigned` / `task_reminder` / `task_unassigned` (v1.9, CR-21: mở với **dữ liệu hiện tại** — mình đã bị gỡ thì dạng người chỉ xem `viewer`; việc thuộc Task Board đang tắt → `lost-access`, CR-17); push nhắc hạn / giao việc (NOTIF-02); "Xem việc" trong tin nhắc hạn của kênh (02); link `https://nezfocus.app/tasks/<id>` chạm trong chat (mở thẳng trong app, CR-19) hoặc deep link từ ngoài. **Đi tới:** S-TASK-03 `edit` (⋯ › Sửa), dialog xóa, S-HOME-01 kênh gốc (chạm dòng kênh), S-HOME-10 (chạm Người tạo hoặc một Assignee).

### Bố cục (`assignee`)
```
┌ Status bar ──────────────────────────────┐
│ ‹  Chi tiết việc                     ⋯   │  ScreenHeader (⋯: Sửa, Xóa — theo quyền)
│ Nộp báo cáo giữa kỳ                      │  title-2, xuống dòng
│ [● Cần làm | Đang làm | Xong]            │  SegmentedControl (C-20), trạng thái chung
│ 📅 Hạn         Thứ 6, 23/10 · 23:59      │  SettingsRow (C-15) value
│ #  Kênh        #viec-nhom · Ôn thi GT2 › │  SettingsRow nav → kênh
│ NGƯỜI TẠO                                │  (v1.9, CR-20) nhãn nhóm
│ (B)● Bình                                │  MemberRow · username (C-28), chạm → S-HOME-10
│      binh.tran                           │
│ NGƯỜI ĐƯỢC GIAO — 2                      │
│ (A) An (bạn)                             │  MemberRow · username (C-28, 22/10/2026)
│     an.nguyen                            │
│ (B) Bình                                 │
│ [ Rút khỏi việc này ]                    │  Button · text
│ MÔ TẢ                                    │
│ Mỗi người viết 2 chương, gộp file trước  │  body, xuống dòng
│ 20:00 thứ 5 để kịp đọc lại.              │
│ LỊCH SỬ                                  │
│ • Bình đã đổi hạn 20/10 → 23/10 · 20:05  │  label, mới nhất trên cùng, 3 dòng
│ • Bình đã thêm bạn           · Hôm qua   │  người đang xem (An) = "bạn"
│ • Bình đã sửa mô tả          · 16/10     │
│ [ Xem toàn bộ lịch sử ]                  │  Button · text, khi > 3
├ TabBar ──────────────────────────────────┤
```

### Nội dung chữ (hàng Người tạo — v1.9, CR-20 #7)
| Trường hợp | Chữ |
|---|---|
| Thường | Nhãn nhóm "NGƯỜI TẠO" · `MemberRow · username`: avatar + chấm trạng thái + tên + username |
| Người tạo là mình | "An (bạn)" · `an.nguyen` |
| Người tạo đã rời server | "Bình (đã rời server)" · `binh.tran`, không chấm trạng thái |
| Tài khoản đã xóa | "Tài khoản đã bị xóa", avatar `deleted`, không username, chạm không làm gì |

### Trạng thái
| State | Khác gì | Chữ / hành động riêng |
|---|---|---|
| `assignee` | Như bố cục: đổi được trạng thái; "Rút khỏi việc này"; Người tạo "Bình" | |
| `creator` | Người tạo (Bình xem, Bình cũng là Assignee): Người tạo "Bình (bạn)"; ⋯ có Sửa, Xóa; nút gỡ `x` chỉ trên Assignee **khác** (An), hàng của chính mình không có; "Thêm người" + "Rút khỏi việc này". Lịch sử gọi Bình là "Bạn": "Bạn đã đổi hạn 20/10 → 23/10", "Bạn đã thêm An", "Bạn đã sửa mô tả" (`delete-confirm` cũng là màn của Bình nên ghi như vậy) | |
| `viewer` | Xem được kênh nhưng không phải Assignee/người tạo, không có `MANAGE_TASKS`: trạng thái là hàng "Trạng thái · Cần làm" (không segmented); nút chính "Tôi làm" (`Button · primary · L` ở đáy). Mẫu: An mở "Viết tài liệu API" (Nhóm đồ án Mobile · `#viec-nhom`, Thứ 4 21/10 · 23:59, **Người tạo Chi** (16/10); Assignee **Chi + Dũng**: Chi tự nhận 16/10, Dũng tự nhận hôm qua) từ Task Board — việc An không làm nên không có trong danh sách của An. Cùng một việc với `lost-access-assignee` (sửa 22/10/2026 để hai frame là một câu chuyện) | "Tôi làm" → thành Assignee, Lịch sử ghi "Bạn đã tự nhận việc" trên máy An, "An đã tự nhận việc" với người khác (AC10); tự nhận không tạo mục `task_assigned` |
| `unassigned` | "Làm slide thuyết trình": Người tạo "An (bạn)"; nhóm Người được giao ghi "Chưa giao"; "Tôi làm" | |
| `lost-access-assignee` | Một Assignee mất `VIEW_CHANNEL`: hàng của người đó có chữ "mất quyền truy cập" + icon `eye-off` màu `danger`. Mẫu: cùng "Viết tài liệu API" của `viewer` (An xem, cùng mô tả và Lịch sử), sau khi Chi mất quyền; Dũng còn. Hàng Người tạo vẫn là "Chi" như thường (chỉ hàng Assignee mang nhãn mất quyền) | STUDY-06 |
| `history` | Màn toàn bộ lịch sử (`ScreenHeader` "Lịch sử"): mọi dòng, nhóm theo ngày. Mẫu "Nộp báo cáo giữa kỳ" (An xem): 15/10 "Bình đã tạo việc" 22:30 · "Bình đã tự nhận việc" 22:30 · "Bình đã đặt hạn 20/10" 22:31; 16/10 đổi tiêu đề 09:10, sửa mô tả 09:12; hôm qua "Bình đã thêm bạn" 21:40 (khớp mục `task_assigned` ở 06); hôm nay đổi hạn 20/10 → 23/10 20:05 — khớp hai Assignee An + Bình | Sửa mô tả chỉ ghi "đã sửa mô tả" |
| `delete-confirm` | `Dialog` "Xóa việc này?" · "Việc sẽ biến mất khỏi Task Board và danh sách của mọi người." · "Hủy" / "Xóa" (`danger`). Nền là `creator` (có hàng Người tạo "Bình (bạn)"). Xóa xong, mọi mục hộp thư của việc biến mất (06) | |
| `lost-access` | Mở từ push / deep link / mục hộp thư khi mình đã mất quyền xem kênh, việc đã bị xóa, hoặc Task Board của kênh đang tắt (v1.9, CR-17): thân màn hình là thông báo căn giữa + icon neo `eye-off` 56 | "Bạn không còn xem được việc này" · "Việc đã bị xóa, Task Board của kênh đang tắt, hoặc bạn không còn ở kênh chứa nó." · "Về Việc cần làm" |
| `loading` | Mở từ push, chưa có cache: `Skeleton` tiêu đề + 3 hàng | |
| `offline` | `Banner · offline`; đổi trạng thái / nhận việc vào outbox (hàng hoặc segmented mờ tới khi gửi xong, dòng "Sẽ gửi khi có mạng"). Chỉ thêm hai thứ đó: mọi phần khác giữ như `assignee` (Người tạo, "Rút khỏi việc này", Lịch sử, "Xem toàn bộ lịch sử"); màn dài hơn chiều cao khung nên phần cuối nằm dưới mép, cuộn được | |

Không áp dụng: `empty` (việc luôn có tiêu đề), `os-permission`.

### Checklist duyệt
- [ ] 10 state (+ bản sáng và khung 360 của `assignee`); mọi state có thân việc đều có hàng Người tạo ngay dưới hàng Kênh.
- [ ] Lịch sử khớp trạng thái hiện tại và Assignee hiện tại.
- [ ] Chỉ hiện thao tác người xem có quyền (không hiện nút vô hiệu).

---

## S-TASK-03 · Thêm / sửa việc

**Mục đích:** tạo việc cho kênh, giao cho một hoặc nhiều người, đặt hạn.
**REQ:** STUDY-06 (AC3), UF-06, 40016, 40303.
**Mở từ:** "Thêm việc" ở S-HOME-03 `task-board` / `task-empty` (`create`); S-TASK-02 ⋯ › Sửa (`edit`); "Sửa" ở menu nhấn giữ hàng việc (S-TASK-01 `row-menu`, Task Board — v1.9). **Đi tới:** S-TASK-02 của việc vừa lưu; back → nơi mở.

### Bố cục (`create`)
```
┌ Status bar ──────────────────────────────┐
│ ‹  Thêm việc                             │  ScreenHeader
│ # viec-nhom · Ôn thi Giải tích 2         │  label, kênh cố định
│ Tiêu đề                         0/200    │  TextField + đếm ký tự
│ [ VD: Nộp báo cáo giữa kỳ            ]   │
│ Mô tả (tùy chọn)                         │
│ [                                    ]   │  TextField nhiều dòng
│ 📅 Hạn                    Chưa đặt   ›   │  SettingsRow → deadline-sheet
│ 👤 Người được giao        Chưa giao  ›   │  SettingsRow → assignee-picker
│                                          │
│ [            Thêm việc            ]      │  Button · primary · L
├ TabBar ──────────────────────────────────┤
```

### Trạng thái
| State | Khác gì | Chữ / hành động riêng |
|---|---|---|
| `create` | Như bố cục | Kiểm tra khi bấm: "Nhập tiêu đề" (rỗng); hạn đã qua: "Hạn phải sau thời điểm hiện tại" (dưới dòng Hạn) |
| `filled` | Đã nhập: tiêu đề, mô tả, hạn "Thứ 6, 23/10 · 23:59", Người được giao = **avatar chồng** (Avatar 24, viền 2 `bg`, chồng −6; mình dùng `primary`) + tên "An, Bình". Từ 3 người: avatar (tối đa 3, rồi "+n") + "n người" để không đè nhãn (mẫu `invalid-assignee`: A B C + "3 người"); 1 người: một avatar + tên. Cùng cách ghi ở `edit`, `saving`, `past-due`, `invalid-assignee` và edge `board-disabled`. Người khác được chọn sẽ nhận mục `task_assigned` khi lưu (06); chọn chính mình thì không | |
| `edit` | `ScreenHeader` "Sửa việc"; giá trị cũ; nút "Lưu" | |
| `keyboard-open` | `OS/Keyboard · text` khi gõ tiêu đề. Vùng nội dung chỉ thu lại phía trên bàn phím: **mọi ô vẫn còn** (Mô tả, Hạn, Người được giao), form cuộn được, nút chính nằm ngay trên bàn phím (sửa 19/10/2026 — bản đầu giấu các ô còn lại) | Phím Return "Tiếp" → ô Mô tả |
| `deadline-sheet` | `BottomSheet` "Hạn": chip nhanh (`FilterChip`) "Hôm nay" · "Ngày mai" · "Thứ 6 tới" (thứ 6 gần nhất sau hôm nay — "tuần này" dễ hiểu nhầm vào Chủ Nhật) · "Chọn ngày…"; hàng "Ngày" (giá trị theo luật Thời gian, vd "Thứ 6, 23/10" — không ghi năm khi cùng năm; mở bộ chọn ngày của Android) và "Giờ"; dòng giờ "23:59" (chạm → bộ chọn giờ Android); "Bỏ hạn" (`text`); "Xong" | Giờ mặc định 23:59 |
| `assignee-picker` | `BottomSheet` cao gần hết màn: `SearchField` "Tìm thành viên", hàng "Tôi (An)" trên cùng, rồi thành viên **xem được kênh** xếp theo tên; mỗi hàng `MemberRow · username` (C-28, sửa 22/10/2026 để phân biệt người trùng tên) + `Checkbox` **bên phải** (sửa 22/10/2026, một luật với 08 và 09 S-DM-03); đáy: "Đã chọn 2 · Xong" | Tìm không dấu |
| `invalid-assignee` | Lưu thất bại vì người được chọn vừa mất quyền xem kênh: `FormMessage` trên nút | "Chi không còn xem được kênh này nên không thể giao việc. Bỏ chọn Chi rồi lưu lại." (40016) |
| `date-picker` | "Chọn ngày…" (hoặc chạm hàng "Ngày") mở bộ chọn ngày của Android (`OS/DatePicker`, dialog): tháng 10/2026, tuần bắt đầu thứ 2, hôm nay 18 có viền, đang chọn 23; **ngày đã qua mờ, không chọn được** | "Hủy" / "OK" (chữ của hệ điều hành) |
| `time-picker` | Hàng "Giờ" mở bộ chọn giờ của Android (`OS/TimePicker`, 24 giờ): 23:59, mặt số hai vòng (0–11 ngoài, 12–23 trong) | |
| `saving` | Nút chính `loading` | |
| `past-due` | Chọn **hôm nay** với giờ đã qua — bộ chọn ngày không cho chọn ngày đã qua nên đây là đường duy nhất tới lỗi (sửa 22/10/2026; bản trước dùng 16/10, không đi tới được): hàng Hạn "Hôm nay · 19:00" (bây giờ 20:12), dòng lỗi dưới hàng Hạn, icon `circle-alert`. Lỗi hiện khi bấm "Xong" ở sheet Hạn hoặc khi lưu (server trả `40017` nếu giờ qua trong lúc đang mở form) | "Hạn phải sau thời điểm hiện tại" (`40017`, DEC-42) |

Không áp dụng: `loading` (form trống / dữ liệu có sẵn), `empty`, `forbidden` (không có `CREATE_TASKS` thì nút "Thêm việc" ở Task Board ẩn), `os-permission`.

### Checklist duyệt
- [ ] 11 state; `create` cả hai theme. Trên canvas các frame xếp theo thứ tự bảng state, bản sáng ở cuối hàng.
- [ ] Người được giao luôn là avatar chồng + tên (hoặc "n người" khi từ 3 người).
- [ ] Hàng "Tôi (An)" luôn đầu danh sách chọn người.

---

## Ma trận trạng thái chuẩn

| Màn hình | default | loading | empty | error | offline | forbidden | os-permission |
|---|---|---|---|---|---|---|---|
| S-TASK-01 | ✔ | ✔ | ✔ (+ `all-done`, `search-empty`) | toast khi làm mới | ✔ | — chỉ hiện việc còn xem được | — |
| S-TASK-02 | ✔ `assignee` | ✔ | — | toast | ✔ | ✔ `viewer` (ẩn thao tác), `lost-access` | — |
| S-TASK-03 | ✔ `create` | — | — | ✔ `invalid-assignee` | outbox: lưu được, việc mới ở dạng chờ gửi | nút mở form ẩn | — |

## Edge case (rà ngày 19/10/2026; bổ sung v1.9 ngày 30/10/2026)

Frame nằm trong nhóm "05 · Việc cần làm — Edge case" (hàng ngay dưới S-TASK-03), tên `S-TASK-EDGE · <trường hợp>`. Chủ dự án chọn cả 16 trường hợp; v1.9 thêm `many-done` và 4 luật (CR-20, CR-17).

### Có frame
| Tình huống | Hiển thị | Căn cứ |
|---|---|---|
| `removed-while-viewing` — An đang xem "Nộp báo cáo giữa kỳ" thì Bình gỡ An | Màn chuyển sang dạng người chỉ xem: trạng thái thành hàng chữ, hàng Người tạo "Bình" giữ nguyên, nhóm Người được giao chỉ còn Bình, mất "Rút khỏi việc này", hiện "Tôi làm" ở đáy; Lịch sử thêm "Bình đã gỡ bạn · 20:12"; `Toast` "Bình đã gỡ bạn khỏi việc này". Việc rời danh sách của An ở lần làm mới tiếp theo; mục `task_assigned` của việc ở hộp thư giữ nguyên chữ (06) | STUDY-06, STUDY-08 AC2, NOTIF-05 |
| `board-disabled` — Task Board bị tắt đúng lúc đang thêm việc | `FormMessage` trên nút: "Task Board của kênh này vừa bị tắt nên không thêm được việc."; chữ đã nhập giữ nguyên | STUDY-06 AC6 (40302) |
| `offline-create-failed` — tạo việc lúc offline, có mạng lại thì lưu thất bại | Hàng việc trên Task Board: ô trạng thái rỗng, dòng phụ icon `circle-alert` + "Không lưu được · Thử lại" (`danger`); chạm → thử lại, nhấn giữ → "Xóa bản nháp". Đang ở trong Task Board của một kênh nên dòng phụ mọi hàng chỉ có hạn (có giờ), không ghi tên server | 7.3.2 (outbox), 40016 |
| `many-tasks` — 12 quá hạn, 8 hôm nay | Badge tab Việc "20" (> 99 → "99+"); nhóm "QUÁ HẠN — 12" dài, xếp **hạn tăng dần** ("Quá hạn · 11/10 · 23:59" trên cùng … "Quá hạn · 16/10 · 23:59", hàng cuối là việc quá hạn trong hôm nay "Quá hạn · Hôm nay · 19:00"; trùng hạn: tạo trước đứng trước — luật "Thứ tự trong nhóm"), danh sách cuộn; tiêu đề nhóm không dính | STUDY-08, C-13 |
| `many-done` 🆕 — (v1.9) An đã xong 64 việc | Nhóm "ĐÃ XONG — 64" mở, frame vẽ ở vị trí đã cuộn tới **cuối trang đầu** (việc thứ 48–50, mới xong trên cùng nên đây là việc xong sớm nhất của trang): "Làm bài tập chương 1" (Xong · 03/10 · 21:30 · Ôn thi Giải tích 2), "Chép đề cương môn học" (Xong · 02/10 · 22:10 · Ôn thi Giải tích 2), "Cài đặt Android Studio" (Xong · 02/10 · 08:45 · Nhóm đồ án Mobile), rồi `Button · text` "Xem thêm" căn giữa. Chạm → tải 50 việc tiếp (Skeleton 2 hàng ở cuối). Offline: "Xem thêm" `disabled` (cache chỉ giữ trang đầu). Badge tab Việc không đổi (chỉ tính quá hạn + hôm nay) | DEC-40 sửa, STUDY-08, 7.3.2 |
| `long-title-list` / `long-title-detail` — tiêu đề 200 ký tự, mô tả 2000 ký tự | Danh sách: tiêu đề tối đa 2 dòng, cắt `…`; dòng phụ một dòng, hạn có giờ, cắt tên server trước; giữ đủ các nhóm như `default` (SAU ĐÓ, KHÔNG HẠN, "ĐÃ XONG — 3" — nhóm cuối nằm ngay dưới mép, danh sách cuộn). Chi tiết: tiêu đề và mô tả hiện đủ, màn cuộn; có hàng Người tạo | STUDY-06 (≤ 200 / ≤ 2000) |
| `many-assignees` — 12 người được giao | Chi tiết: hàng Người tạo, rồi "NGƯỜI ĐƯỢC GIAO — 12", liệt kê đủ (An đầu), màn cuộn; hàng ở danh sách vẫn 3 avatar + "+9" | DEC-25, C-12 |
| `large-text-list` / `large-text-detail` — cỡ chữ 200% | Danh sách: tiêu đề 2 dòng, dòng phụ (hạn có giờ · server, vd "Quá hạn · 16/10 · 23:59 · Nhóm đồ án Mobile") xuống dòng tự do — quá hạn thì cả dòng màu `danger`, avatar 28 xuống dưới dòng phụ (`TR avatars below`), icon không phóng, chip lọc cuộn ngang; nút 🔍 giữ cỡ, tiêu đề màn xuống dòng nếu cần. Chi tiết: tiêu đề xuống dòng, `SegmentedControl` giữ 1 hàng (nhãn cắt `…`: "Cần l…", "Đang…"), hàng Hạn / Kênh cao theo chữ, giá trị xuống dưới nhãn (C-15); hàng Người tạo: tên và username mỗi thứ một dòng, cắt `…` | DESIGN.md › Typography, NFR-A11Y-03 |

### Chỉ ghi luật (giao diện không đổi)
| Tình huống | Luật |
|---|---|
| Việc bị xóa khi đang xem chi tiết | Chuyển sang S-TASK-02 `lost-access`, chữ "Việc này đã bị xóa" · "Người tạo hoặc quản lý kênh đã xóa việc." |
| Người được giao rời server / bị purge / **tự rút** (v1.9, CR-20) | Bị gỡ khỏi việc; danh sách rỗng → việc "Chưa giao", người tạo nhận mục `task_unassigned` ("{Tên} đã rời {Server}" / "{Tên} đã rút khỏi việc"); người rút cuối cùng là chính người tạo thì không có mục (STUDY-06 AC5, 06) |
| Mất quyền xem kênh | Việc của kênh biến khỏi tab Việc ở lần làm mới tiếp theo (STUDY-08 AC2); đang mở chi tiết → `lost-access` |
| Mở từ mục hộp thư khi Task Board của kênh đang tắt (v1.9, CR-17) | Mục ở 06 giữ nguyên; chạm → S-TASK-02 `lost-access`. Bật lại Task Board thì chạm mục mở chi tiết như thường |
| Người tạo đã rời server / xóa tài khoản (v1.9, CR-20) | Hàng Người tạo theo bảng "Nội dung chữ (hàng Người tạo)"; việc giữ nguyên, quyền Sửa / Xóa của người đó không còn ý nghĩa (người có `MANAGE_TASKS` vẫn sửa được) |
| Mở nhắc hạn khi việc đã xong | Mở S-TASK-02 bình thường (trạng thái Xong, hàng Hạn không `danger`), không báo lỗi |
| Hai người cùng đổi trạng thái | Lần ghi sau thắng; màn đang mở tự cập nhật qua `TASK_UPDATE`; Lịch sử ghi cả hai |
| Hai người cùng bấm "Tôi làm" | Cả hai thành Assignee (không giới hạn, DEC-25); Lịch sử ghi hai dòng |
| Qua mốc hạn / nửa đêm khi đang xem | Dòng phụ đổi thành "Quá hạn · Hôm nay · 21:00" (hoặc "Quá hạn · 17/10 · 23:59" sau nửa đêm) tại chỗ, badge tab Việc cập nhật; hàng chỉ đổi nhóm khi mở lại tab hoặc kéo làm mới |
| Kênh đã có 500 việc chưa xong | "Thêm việc" vẫn hiện; lưu → `FormMessage` "Kênh đã có 500 việc chưa xong. Đánh dấu xong hoặc xóa bớt để thêm việc mới." (STUDY-06, `40018`) |
| **Hoàn tác khi đang offline** (v1.9, CR-20 #2) | Lần đổi trạng thái còn nằm trong outbox thì "Hoàn tác" rút nó khỏi outbox: ô về như cũ, hàng hết mờ, không gửi gì, Lịch sử không có dòng nào. Lần đổi đã gửi xong thì Hoàn tác là một lần đổi mới (vào outbox nếu đang offline) |
| **Hoàn tác vướng 500 việc** (v1.9, CR-20 #2) | Hoàn tác (hoặc mở lại từ tick xanh / menu) về chưa xong khi kênh đã có 500 việc chưa xong → `40018`: ô về lại Xong, `Toast` "Kênh đã có 500 việc chưa xong. Đánh dấu xong hoặc xóa bớt rồi mở lại." (không có Hoàn tác) |
| Hạn dưới 2 giờ khi tạo | Không gửi các lời nhắc đã lỡ mốc (24 giờ / 2 giờ trước hạn); chỉ gửi mốc còn ở tương lai |

## Câu hỏi còn mở

Không còn. 15 câu chốt 19/10/2026 (chủ dự án đồng ý cả 15); phần là hành vi mới ghi ở `SRS_v1.2_change_notes.md` mục 9 (CR-04 dòng 11–15, đã áp vào SRS v1.5). Thay đổi v1.9 theo CR-20 (mục 25), CR-21 (mục 26), CR-17 #11 (mục 22) của cùng file, đã áp vào SRS v1.9 ngày 30/10/2026.
