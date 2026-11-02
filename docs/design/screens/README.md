# Đặc tả màn hình (Screen Spec) — NezFocus

Folder này chứa đặc tả chi tiết từng màn hình của app mobile NezFocus: bố cục, nội dung chữ, component dùng, và **mọi trạng thái** của màn hình. Đây là đầu vào để vẽ thiết kế hi-fi bằng Pencil, và là nơi duy nhất mô tả UI ở mức chi tiết.

- **SRS chỉ giữ yêu cầu** ("phải hiện chỉ báo đang được tính giờ"). Folder này giữ **cách thể hiện** (chỉ báo nằm ở đâu, viết chữ gì, trông thế nào ở từng trạng thái). Không chép lại yêu cầu từ SRS; trỏ tới REQ-ID.
- Khi spec và SRS mâu thuẫn: SRS thắng về hành vi, spec thắng về hình thức. Mâu thuẫn về hành vi phải sửa SRS qua Change Request.

## Nguồn tham chiếu

| Nguồn | Dùng cho |
|---|---|
| [SRS v1.10](../../SRS_NezFocus.md) (v1.9 gộp CR-12 → CR-25 ngày 30/10/2026, Phụ lục 11.13; v1.10 gộp CR-27 — web quản trị — ngày 01/11/2026, Phụ lục 11.14; nội dung từng CR ở [`SRS_v1.2_change_notes.md`](../../SRS_v1.2_change_notes.md) §17–32), đặc biệt Mục 3 (UX) và 4 (REQ) | Hành vi, quyền, luồng, mã lỗi |
| [GLOSSARY.md](../../../GLOSSARY.md) | Thuật ngữ miền (Room Session, Study Room, Host…) |
| [DESIGN.md](../../../DESIGN.md) (root repo, tạo bằng skill `ui-design-system-vi` ngày 16/10/2026) | Màu, typography, spacing, bo góc, motion, quy tắc dùng mascot (xem [Phân chia với DESIGN.md](#phân-chia-với-designmd)) |
| `Des/nezfocus.pen` (mở bằng Pencil / pen.dev) | Variables sinh từ `DESIGN.md`, token board `00 · Tokens`, component, các frame màn hình |
| [Des/nez-mascot/MASCOT_BRIEF.md](../../../Des/nez-mascot/MASCOT_BRIEF.md) | Mascot "Runtime": giải phẫu, bảng màu gốc, các mood |

## Quy trình

```
0. SRS Mục 3 đã chốt (v1.2)                                        ✅
1. skill ui-design-system-vi → DESIGN.md + variables Pencil         ✅  (16/10/2026)
2. README này: danh mục màn hình + quy ước                           ✅
3. Pencil: component dùng chung                                      ✅  (16/10/2026)
4. Vertical slice: Study Room + tab Học, đủ mọi trạng thái → duyệt   ✅  (17/10/2026)
5. skill ui-feature-spec-vi: các feature area còn lại theo ưu tiên  ✅  (P1 + P2 duyệt 22–23/10/2026)
6. Đợt backport SRS v1.9 (CR-12 → CR-25): sửa spec                 ✅  (30–31/10/2026)
7. Vẽ lại canvas theo worklist của đợt v1.9 → duyệt                  ✅
8. Web quản trị (CR-27): ui-design-system-vi (cập nhật) → DESIGN.md ✅  (01/11/2026)
   ui-components-vi → C-42…C-50 + trạng thái web của C-01 / C-23                  ✅  (01/11/2026)
   ui-feature-spec-vi W1 · Báo cáo (vertical slice web quản trị): spec + vẽ + edge case + kiểm hai theme ✅  (01–02/11/2026, duyệt 02/11/2026)
   ui-feature-spec-vi W2 · Người dùng & Server: spec + hành vi chốt (15 câu) + vẽ + 2 vòng duyệt + sắp xếp + edge case ✅  (02/11/2026, duyệt 02/11/2026)
   ui-feature-spec-vi W3 · Tổng quan & Nhật ký: spec + hành vi chốt (15 câu) + vẽ (29 frame, C-51, C-52) + 3 vòng duyệt (bộ chọn 7/30/90 ngày, tên người làm, ô tìm) + edge case (5 frame) ✅ (02/11/2026, duyệt 02/11/2026)
   ui-feature-spec-vi W4 · Đăng nhập & khung: spec + hành vi chốt (14 câu, không toast) + vẽ + bỏ màn chặn dưới 1024 (cuộn ngang) + bỏ CAPTCHA ở MVP cho app và web (Q16) + edge case (1 frame + 16 luật) ✅ (02/11/2026, duyệt 02/11/2026)
   Web quản trị: cả bốn area W1–W4 đã duyệt. Tiếp theo: chưa có area web nào trong danh mục — chờ Product Owner chọn việc kế (code, P3 mobile, hoặc G0 đang tạm dừng)
```

Mỗi màn hình đi qua 3 bước: **Spec** (viết file spec) → **Vẽ** (Pencil) → **Duyệt** (đối chiếu ảnh chụp với checklist trong spec, chủ dự án xác nhận). Trạng thái ghi ở cột cuối của danh mục bên dưới.

## Phân chia với DESIGN.md

| | `DESIGN.md` (root repo) | Folder này |
|---|---|---|
| Trả lời câu hỏi | App **trông như thế nào** — áp dụng cho mọi nơi có giao diện (app, ảnh store, landing page) | **Màn hình nào, có gì, ở trạng thái nào** — và cách làm spec, cách vẽ trong Pencil |
| Nội dung | Màu & token theo theme, typography, spacing & lưới, bo góc, elevation, icon, motion, nguyên tắc accessibility về thị giác, quy tắc dùng mascot | Danh mục màn hình, bố cục, nội dung chữ, state matrix, tương tác, frame & cách đặt tên, dữ liệu mẫu, nhãn UI, checklist duyệt |
| Khi trùng | Chỉ ghi ở `DESIGN.md`; folder này **trỏ tới**, không chép lại | — |

### Tra cứu nhanh trong DESIGN.md

Các ràng buộc từng ghi ở đây (lưới, vùng chạm, theme, cỡ chữ, màu trạng thái, màu thương hiệu, mascot) nay nằm trong `DESIGN.md`. Spec trỏ tới các mục này, không chép giá trị.

| Khi viết spec cần… | Xem |
|---|---|
| Màu theo vai trò, hai theme, tương phản | [Colors](../../../DESIGN.md#colors) |
| Mã hóa pha Tập trung / Nghỉ ngắn / Nghỉ dài (màu, icon, nhãn, kiểu nét vòng) | [Colors → Trạng thái nghiệp vụ](../../../DESIGN.md#colors) |
| Thang chữ, font cho số, cỡ chữ 200% | [Typography](../../../DESIGN.md#typography) |
| Lề, lưới 8, chiều cao thanh cố định, mật độ theo chế độ màn hình | [Layout](../../../DESIGN.md#layout) |
| Vùng chạm, cử chỉ, rung | [Platform & Touch](../../../DESIGN.md#platform--touch) |
| Mascot ở đâu, không bao giờ ở đâu, mood, cỡ | [Illustration & Mascot](../../../DESIGN.md#illustration--mascot) |
| Chuyển động, khoảnh khắc chuyển pha | [Motion](../../../DESIGN.md#motion) |
| Component đã có trong design system | [Components](../../../DESIGN.md#components) |

## Quy ước của folder spec

| Hạng mục | Quy ước |
|---|---|
| Nền tảng | App mobile **Android** ở MVP (React Native; DEC-30, SRS v1.3 — iOS ở Backlog). Các skill dùng hồ sơ **mobile** trong `PLATFORMS.md` của chúng. **(01/11/2026, CR-27)** Thêm **web quản trị** cho đội vận hành (trình duyệt máy tính, khung 1440 × 900, kiểm thêm 1024 × 768; dưới 1024 cuộn ngang — duyệt W4 02/11/2026, thay màn chặn): các area quản trị dùng hồ sơ **web**; phần riêng ở [`DESIGN.md` › Web quản trị](../../../DESIGN.md#web-quản-trị) |
| Frame chuẩn | **390 × 844** — khung thiết kế, nằm giữa 360 và 412 dp của máy Android phổ biến (chốt 18/10/2026, DEC-30). Kiểm thêm **360 × 800** cho màn hình có nhiều chữ hoặc bảng. |
| Safe area | Chừa status bar (top) và home indicator / thanh điều hướng Android (bottom). Nội dung không nằm dưới hai vùng này. |
| Theme khi duyệt | Vertical slice duyệt cả hai theme; màn hình khác duyệt theme chính, theme còn lại kiểm nhanh. |
| Cỡ chữ lớn | Spec ghi rõ chỗ nào cho phép xuống dòng, chỗ nào cắt `…` khi chữ 200%. |
| Nội dung chữ | **Chữ thật bằng tiếng Việt** lấy từ spec; không dùng lorem ipsum, không để Pencil tự đặt chữ. Tên người, server, kênh mẫu dùng bộ dữ liệu mẫu bên dưới. |
| Đặt tên frame | `<SCREEN-ID> · <state>`, ví dụ `S-ROOM-02 · focus-host`, `S-TASK-01 · empty`. Frame mặc định dùng state `default`. |
| Đặt tên component | Theo `00-components.md`, ví dụ `TabBar`, `ChannelRow`, `FocusTimer`. |
| File Pencil | Một file `Des/nezfocus.pen` cho toàn app. Frame `00 · Tokens` là token board. Frame mang tiền tố `Preview ·` là bản xem trước của design system, **không** phải màn hình đã duyệt; màn hình thật vẽ lại theo spec. |

### Bộ dữ liệu mẫu (dùng chung mọi màn hình)

| Loại | Giá trị |
|---|---|
| User chính | **An** (`an.nguyen`), Host trong ví dụ học nhóm |
| Bạn bè / thành viên | **Bình** (`binh.tran`), **Chi** (`chi.le`), **Dũng** (`dung.pham`) |
| Server | **"Ôn thi Giải tích 2"** (Study Server), **"Nhóm đồ án Mobile"** (Study Server), **"CLB Guitar PTIT"** (server thường) |
| Kênh | `#chao-mung` (v1.9: đứng đầu THÔNG TIN, kênh tin chào mừng — tin "X đã tham gia server" chỉ ở đây; 02 › Quy ước › Dữ liệu mẫu), `#thong-bao`, `#tai-lieu`, `#hoi-dap`, `#viec-nhom`; 🔊 "Phòng học im lặng", 🔊 "Phòng thảo luận nhóm" (cả hai là Phòng học; "im lặng" chỉ là tên kênh — v1.9 không còn Silent Room) |
| Task mẫu | "Nộp báo cáo giữa kỳ" (hạn thứ 6, An + Bình), "Làm slide thuyết trình" (chưa giao), "Sửa lỗi đăng nhập" (Nhóm đồ án Mobile, quá hạn, An + Dũng). Bộ đủ việc của An, kể cả **Đã xong** ("Tóm tắt chương 3 — đạo hàm riêng" 17/10 22:05, "Đặt phòng thư viện cho buổi ôn" 16/10 09:30, "Thiết kế màn hình đăng nhập" 15/10 21:40): 05 › Quy ước › Dữ liệu mẫu; Task Board `#viec-nhom` của Ôn thi Giải tích 2 (có hai việc Xong đầu): 02 S-HOME-03 `task-board` |
| Streak / thống kê | Streak 6 ngày; tuần này 4 giờ 35 phút. Phút từng ngày của 5 tuần, tháng 10, dài nhất 14 ngày, từ trước tới nay 86 giờ: **04 › Quy ước › Thống kê mẫu** (v1.9, CR-23) |
| Giờ mẫu (chốt 22/10/2026 khi rà soát) | **20:12, Chủ Nhật 18/10/2026** cho mọi area, **trừ** 01 (Đăng nhập & Onboarding), 03 (Phòng học) và 04 (tab Học) dùng **21:47** cùng ngày (tab Học hiện đúng các phòng đang chạy ở 03). Mọi mốc trong frame phải khớp giờ trên status bar: "nghỉ lúc…" = giờ status bar + số phút còn lại; không có sự việc đã xảy ra muộn hơn giờ status bar; frame copy nền của area khác thì đổi giờ theo area của frame |
| Câu chuyện 21:47 (area 03, 04) | Phiên học ở "Phòng học im lặng" bắt đầu **21:11** (25/5); lúc 21:47 đang Vòng 2, còn 18:42, nghỉ ngắn lúc 22:06. An học một mình 14 phút buổi chiều, vào phòng lúc 21:11 → 31 phút trong phiên, **45 phút hôm nay**; tuần 4 giờ 35 phút; chuỗi **6** ngày. Phòng học im lặng có 9 người: An, Bình, Chi, Dũng, Giang, Hà, Khánh, Lan, Mai. Bạn của An: Bình, Chi, Dũng, Lan (trong Phòng học im lặng), Tuấn (Phòng thảo luận nhóm của Nhóm đồ án Mobile), Minh (học một mình; nhánh `many-rooms` / S-STUDY-06: ở Phòng ôn tập 2 — 04 › Phòng & bạn bè mẫu). Phòng thảo luận nhóm của Ôn thi GT2 chưa có phiên, có Nam và Quân (03) |
| An trong server | An là **Owner** của "Ôn thi Giải tích 2" (tạo server, vào sớm nhất: "Thành viên từ 01/10/2026"), có thêm vai trò Trưởng nhóm. Vai trò mẫu theo thứ bậc: **Quản trị** (Tuấn) > **Trưởng nhóm** (An, Bình) > **Điều phối phòng học** (Chi) > @everyone (đổi 22/10/2026: "Phó nhóm" thành "Quản trị" và đặt trên Trưởng nhóm để demo thứ bậc dễ hiểu) |
| Giới thiệu & hoạt động học (v1.9) | Giới thiệu (`users.bio`) của từng người: **02 › Quy ước › Dữ liệu mẫu** — ví dụ Khánh "Bán tài liệu ôn thi giá rẻ · inbox mình", Bình "Lớp trưởng D22CN05 · hỏi bài cứ tag mình", Mai "Sinh viên K22 PTIT". Hoạt động học lúc 20:12: 02 (Dũng học một mình, Hà "Đang học cùng nhóm") và 09 › Dữ liệu mẫu (góc nhìn DM / bạn bè); lúc 21:47: 03, 04 |
| Kết bạn (v1.9) | Giang (`giang.vo`) mời An 19:48 với lời nhắn **"Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé"** (06 + 09); An đã gửi Hà hôm qua (không lời nhắn); An chặn Phong; mẫu tra cứu ở S-DM-05 là **Mai** (`mai.tran`, cùng Ôn thi Giải tích 2, chưa là bạn, không có lời mời) |
| Báo cáo (v1.9) | Ôn thi Giải tích 2 có **2** đối tượng chờ (badge trung tính "2"): hồ sơ của Nam; tin của Khánh 20:05 ở `#hoi-dap` "Bán đề thi giữa kỳ có đáp án 50k…" với 2 báo cáo — "Gian lận học tập" 20:07, "Lừa đảo" 20:09 (08 › Quy ước; cùng số ở 02 S-HOME-04 `delete-confirm` "2 báo cáo về tin này…"). Báo cáo của An đã được xem xét: tin của Vũ ở `#hoi-dap` · Nhóm đồ án Mobile (06) |
| Username (một bộ cho mọi area) | an.nguyen, binh.tran, chi.le, dung.pham, giang.vo, ha.nguyen, khanh.le, lan.vu, mai.tran, minh.do, nam.ho, quan.ng, tuan.hoang, phuc.le, vu.dang, phong.vu. Không dùng tên ngoài bộ này. **Ngoại lệ:** frame edge thử chữ dài (`long-names`, `long-content`, `long-name-*`) được dùng tên hiển thị / username dài riêng (ví dụ "Nguyễn Hoàng Phương Thảo Nguyên", `tranthithanhhuonggiang2005`) — ghi rõ trong mục Edge case của spec area đó. **Ngoại lệ web quản trị (W2, 02/11/2026):** danh sách người dùng / server xếp mới tạo trên cùng nên dùng thêm 15 **người dùng nền** (thao.nguyen, quang.pham, linh.hoang, huy.tran, ngoc.bui, son.dinh, tailieu.giare99, trang.vo, kiet.ngo, yen.ly, khoa.mai, hoa.dang, nhi.phan, duc.le, bao.truong) và 11 **server nền** (Ôn thi Toán rời rạc … Nhóm nghiên cứu AI, Soi kèo bóng đá) — chỉ trong frame web quản trị, không bao giờ trong app; bảng đủ ở `w2-nguoi-dung-server.md` › Thế giới mẫu |

### Thuật ngữ hiển thị trên UI

Thuật ngữ miền (GLOSSARY) dùng trong tài liệu và code. Trên UI dùng nhãn tiếng Việt dưới đây. Mọi nhãn trong bảng đã chốt.

| Thuật ngữ miền | Nhãn UI |
|---|---|
| Server / Study Server | "Server" / "Study Server" |
| Study Room | "Phòng học" (biểu tượng riêng trên danh sách kênh) |
| Room Session | "Phiên học" (chốt 16/10/2026). Ví dụ: "Bắt đầu phiên học", "Dừng phiên học cho cả phòng (9 người)?", "Bình đã bắt đầu phiên học" |
| Solo Session | "Học một mình" |
| Pha `focus` / `short_break` / `long_break` | "Tập trung" / "Nghỉ ngắn" / "Nghỉ dài" (đã chốt 09/10/2026, SRS 4.9.1). Ví dụ: "Tập trung — còn 13:00", "Hết giờ tập trung — nghỉ ngắn 5 phút" |
| Host | "Đang điều khiển" (chốt 16/10/2026): nhãn cạnh tên trong danh sách; chip của chính mình "Bạn đang điều khiển"; khi chuyển Host: "Bình đang điều khiển phiên học" |
| Việc cần làm | Nhãn tab "Việc", tiêu đề "Việc cần làm"; mục trong drawer phải cũng là "Việc" (không dùng "Task") |
| Presence | "Trực tuyến" / "Ngoại tuyến"; tiêu đề nhóm "TRỰC TUYẾN — 6" / "NGOẠI TUYẾN — 18"; tab bạn bè "Trực tuyến" (chốt 22/10/2026, thay "ONLINE / OFFLINE" và "Online") |
| Mic | "Mic" ở cả nút lẫn câu (không dùng "Micro") |
| Người có quyền quản lý | "người quản lý" (ví dụ "Bạn đã bị người quản lý tắt mic"); không dùng "quản trị" cho người. "Quản trị" chỉ là tên vai trò mẫu, "Quản trị viên" là tên quyền `ADMINISTRATOR` |
| Timeout | "Tạm khóa" (v1.9, CR-17 #1 — thay "Tạm khóa chat" vì tạm khóa chặn cả gửi tin lẫn vào phòng thoại): hành động "Tạm khóa", nhãn trong danh sách "Tạm khóa tới 21:12", câu "Bạn đang bị tạm khóa đến 21:30 · chưa gửi tin được", tên quyền "Tạm khóa thành viên" |
| Bắt đầu phiên | "Bắt đầu Tập trung 25 phút" (không dùng "Focus" trên UI) |
| Slug kênh text | Giữ dấu tiếng Việt theo SRV-02 AC2: `tài-liệu-chương-5`; kênh mẫu cũ không dấu (`tai-lieu`) là tên người tạo đã gõ không dấu |
| Tài khoản đã xóa | "Tài khoản đã bị xóa" |

## Trạng thái chuẩn (state matrix)

Mỗi màn hình phải liệt kê trạng thái nào **có** và trạng thái nào **không áp dụng**. Trạng thái chuẩn lấy từ SRS 3.5:

| State | Khi nào | Ghi chú |
|---|---|---|
| `default` | Có dữ liệu, mọi thứ bình thường | Luôn có |
| `loading` | Đang tải lần đầu | Skeleton, không spinner toàn màn hình quá 1 giây |
| `empty` | Không có dữ liệu | Kèm hành động gợi ý; có thể có mascot |
| `error` | Lỗi tải / thao tác | Thông điệp tiếng Việt theo mã lỗi (SRS 11.1) + nút thử lại |
| `offline` | Mất mạng | Dữ liệu cache + banner "Bạn đang offline" |
| `forbidden` | Thiếu quyền trong server (RBAC) | Vô hiệu hóa kèm lý do |
| `os-permission` | Hệ điều hành từ chối quyền (mic, camera, thông báo) | Màn hình giải thích + nút mở Cài đặt |

Trạng thái riêng của từng màn hình (ví dụ `waiting` của Solo Session, `no-host` của Room Session) đặt tên bằng chữ thường, nối bằng gạch ngang.

## Mẫu một file spec

Mỗi file là một **feature area**, gồm nhiều màn hình. Mỗi màn hình theo khung sau:

````markdown
## S-XXX-NN · Tên màn hình

**Mục đích:** một câu.
**REQ:** REQ-…, UF-…
**Mở từ:** màn hình / thao tác dẫn tới đây. **Đi tới:** các màn hình tiếp theo.

### Bố cục
```
(ASCII thể hiện thứ bậc và vị trí, không phải pixel)
```

### Component
- `TabBar`, `ChannelRow`… (theo 00-components.md)

### Nội dung chữ
| Vị trí | Chữ |
|---|---|

### Trạng thái
| State | Khác gì so với default | Chữ / hành động riêng |
|---|---|---|

### Tương tác
- Chạm / vuốt / nhấn giữ → kết quả.

### Checklist duyệt
- [ ] Đủ các state trong bảng, mỗi state một frame.
- [ ] Chữ đúng như bảng nội dung.
- [ ] …
````

## Câu hỏi còn mở

Các câu hỏi UI/UX chưa chốt. Xóa dòng khi đã chốt và quyết định đã nằm trong SRS hoặc README này.

| # | Câu hỏi | Ảnh hưởng tới | Người chịu trách nhiệm | Chốt trước khi |
|---|---|---|---|---|
| 1 | Web quản trị — email cảnh báo khi admin đăng nhập từ thiết bị mới (REQ-AUTH-02 có cho người dùng; W4 Q7 để ngoài MVP). (Vế thu nhỏ phóng to của màn chặn đã chốt W4, 02/11/2026, vào SRS 4.11) | Web quản trị: đăng nhập, menu CLI | Product Owner | Lập kế hoạch v1.x |

## Danh mục màn hình

> **Đợt backport v1.9 (30–31/10/2026): spec đã sửa, canvas đã vẽ lại ngày 31/10/2026, chủ dự án duyệt ngày 31/10/2026.** Canvas không giữ được chữ gạch ngang: việc đã xong vẽ tiêu đề `text-tertiary` không gạch; khi code vẫn gạch ngang theo C-12. Màn có frame phải vẽ lại hoặc vẽ thêm ghi ✅ ✅ ✅; màn mới ghi ✅ ✅ ✅; màn chỉ đổi chữ trong spec (không đổi frame) giữ ✅ ✅ ✅. Việc vẽ từng frame nằm ở worklist canvas của đợt này; state mới đánh dấu 🆕 trong file area.

**Ưu tiên:** **P0** = vertical slice (vẽ đầu tiên) · **P1** = nằm trong flow demo MVP (UF-01→07) · **P2** = MVP còn lại · **P3** = v1.x.
**Tiến độ:** ☐ chưa · ◐ đang làm · ✅ xong — theo thứ tự Spec / Vẽ / Duyệt.

### 00 · Component dùng chung — `00-components.md`

Cột tiến độ theo mục lục của `00-components.md`.

| ID | Component | Ghi chú | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|
| C-01 | Nút (primary, secondary, danger, text, icon) | Trạng thái: thường, nhấn, vô hiệu, đang xử lý | P0 | ✅ ✅ ✅ |
| C-02 | Ô nhập, ô tìm kiếm, lỗi theo field | | P0 | ✅ ✅ ✅ |
| C-03 | `TabBar` 5 tab có badge | Badge Học = chấm khi đang trong Focus Session; Việc = quá hạn + hôm nay (SRS 3.1). v1.9: luật Back hệ thống (CR-15), không đổi frame | P0 | ✅ ✅ ✅ |
| C-04 | `ChannelHeader` (≡, tên kênh, 💬 ở phòng, 👥; 🔍 từ v1.x) | v1.9: `dm` có tên + username, dòng phụ hoạt động học (C-40) | P0 | ✅ ✅ ✅ |
| C-05 | `ChannelRow` (text, voice, Study Room, đang có Focus, unread, mention) | v1.9: bỏ `+silent` và nhãn "Im lặng" (CR-13) | P0 | ✅ ✅ ✅ |
| C-06 | `FocusTimer` (vòng nhịp; bản `compact` khi có video hoặc chữ 200%) | Phân biệt pha không chỉ bằng màu. v1.9: `other-session` ("còn 18 phút" giữa vòng), `paused · no-host` | P0 | ✅ ✅ ✅ |
| C-07 | `ParticipantTile` — 4 kích cỡ: `ring`, `list`, `video`, `floating` (ô nổi của cuộc gọi thu nhỏ, v1.9) | Đang nói, mic, camera, Host, tạm vắng. v1.9: chỉ đánh dấu người **bật** mic; `video · camera-off` avatar phía trên dải tên | P0 | ✅ ✅ ✅ |
| C-08 | `MiniPlayer` | voice / Room Session / Solo Session / cuộc gọi. v1.9: nút Camera khi camera đang bật (thay icon nhắc), `paused`, `voice-solo` | P0 | ✅ ✅ ✅ |
| C-09 | Bottom sheet, action sheet, dialog xác nhận | v1.9: `ActionSheet` có đầu (tiêu đề + dòng phụ), nhãn nhóm, dấu chọn | P0 | ✅ ✅ ✅ |
| C-10 | `MessageBubble` — hàng phẳng, không bong bóng (thường, gộp nhóm, reply, mention, pending, failed, bị chặn thu gọn, system message, có file) + `ReactionChip`, `MentionChip`, `Divider/date`, `Divider/new` | Viết khi làm 02 (18/10/2026). v1.9: giờ theo ngày, `highlight`, chip link NezFocus, thẻ xem trước link, thẻ âm thanh, tin hệ thống nhắc hạn / cuộc gọi, `failed · file-blocked`; bỏ `blocked-file` | P1 | ✅ ✅ ✅ |
| C-11 | `Composer` (nhập tin, đính kèm, emoji, gửi, trả lời / sửa, vô hiệu kèm lý do) | v1.9: bộ đếm ký tự, dòng lỗi dưới khay đính kèm, chữ "tạm khóa" | P1 | ✅ ✅ ✅ |
| C-12 | `TaskRow` (trạng thái, deadline, Assignee, nhãn "Chưa giao" / "mất quyền truy cập") | v1.9: hạn luôn có giờ, hàng Xong "Xong · dd/MM · HH:mm", nhấn giữ mở menu | P1 | ✅ ✅ ✅ |
| C-25 | `EmojiPicker` | Panel / sheet; dựng trong S-HOME-04 `emoji-picker` | P1 | ✅ ✅ ✅ |
| C-26 | `ServerRail` (`RailItem` dm / server / add; selected, unread, mention) | | P1 | ✅ ✅ ✅ |
| C-27 | `MentionSuggest` (`MentionRow`) | v1.9: nhóm THÀNH VIÊN / VAI TRÒ / KÊNH; người khớp theo tên hiển thị **và** username (đầu tên / đầu từ, không dấu) | P1 | ✅ ✅ ✅ |
| C-28 | `MemberRow` (thường, offline, `in-room` có icon mic khi bật) | v1.9: username cạnh tên, dòng 2 hoạt động học (C-40) | P1 | ✅ ✅ ✅ |
| C-29 | `AttachmentTray` (`AttachItem` ảnh 64 × 64 / tệp 64 × 160; uploading / checking / done / failed / rejected) | v1.9: kiểm tra tệp trước khi gửi (CR-19) | P2 | ✅ ✅ ✅ |
| C-30 | `FilterChip` (chip lọc / chọn nhanh) | Viết khi làm 05 (19/10/2026); dùng ở S-TASK-01, S-TASK-03, S-HOME-07, S-DM-04 `pending` | P1 | ✅ ✅ ✅ |
| C-32 | `DMRow` (1-1 / nhóm, chưa đọc) | Viết khi làm 09 (20/10/2026). v1.9: dòng 2 hoạt động học, tin cuối là cuộc gọi; không username | P1 | ✅ ✅ ✅ |
| C-33 | `FriendRow` (bạn bè, lời mời, đã chặn, chọn người) | Viết khi làm 09 (20/10/2026). v1.9: tên + username, dòng 2 hoạt động / trạng thái, lời mời có thời điểm + lời nhắn | P1 | ✅ ✅ ✅ |
| C-34 | `RadioRow` (chọn một trong danh sách) | Viết khi làm 10 (21/10/2026); lý do báo cáo S-MOD-02 | P2 | ✅ ✅ ✅ |
| C-31 | `NotificationRow` (mention, reply, kết bạn, cuộc gọi nhỡ, nhắc hạn, việc không còn ai làm; chưa đọc / đã đọc) | Viết khi làm 06 (20/10/2026). v1.9: thêm `task_assigned`, `friend_accepted`, `report_reviewed`, `reports_pending`; chữ nhắc hạn "Còn 24 giờ / 2 giờ tới hạn"; lời nhắn của lời mời | P1 | ✅ ✅ ✅ |
| C-13 | Avatar, presence, badge số | Presence theo `DESIGN.md` › Colors › Presence. v1.9: `Badge · count · neutral` (số báo cáo chờ) | P0 | ✅ ✅ ✅ |
| C-14 | Empty state (kèm mascot), skeleton, toast/snackbar, banner (offline, mất kết nối) | v1.9: Toast đảo màu (`primary-inverse`, không bóng — CR-24) | P0 | ✅ ✅ ✅ |
| C-15 | `SettingsRow` (row có giá trị, chevron) + `Switch` | Đưa lên P1 khi viết 01 (múi giờ ở S-ONB-01); `Switch` dựng thành master khi làm S-SET-07 (21/10/2026) | P1 | ✅ ✅ ✅ |
| C-16 | `PhaseBadge` (icon + nhãn pha + thời gian) | Dùng ở timer, hàng kênh, mini-player, tab Học. v1.9: `live · paused` "Tạm dừng 18:42" | P0 | ✅ ✅ ✅ |
| C-17 | `RoomControl` (nút tròn: mic, camera, tạm dừng, bỏ qua pha, rời phòng) | v1.9: hàng Mic · Camera ở màn xem trước phòng, "Tiếp tục" của Participant khi phiên không có Host | P0 | ✅ ✅ ✅ |
| C-18 | `VideoGrid` (xem camera của nhau) | Camera là MVP (SRS 3.7) | P0 | ✅ ✅ ✅ |
| C-20 | `SegmentedControl` | Công tắc "Vòng / Lưới", drawer phải Thành viên / Việc / Ghim | P0 | ✅ ✅ ✅ |
| C-21 | `ChipStatus` (vai trò Host) | Thêm khi vẽ S-ROOM-02. v1.9: bỏ chip "Im lặng"; thêm nhãn quan hệ "Bạn bè" / "Đã gửi lời mời" / "Đã chặn" và "Đang học" | P0 | ✅ ✅ ✅ |
| C-22 | `ScreenHeader` (back + tiêu đề + tối đa 1 hành động) | Thêm khi viết 01; thay header vẽ rời ở 04. v1.9: luật Back (CR-15), không đổi frame | P1 | ✅ ✅ ✅ |
| C-23 | `Checkbox` | Thêm khi viết 01 (tuổi, điều khoản — nay ở S-ONB-01 Hoàn tất tài khoản). v1.9: `checked-locked` (S-SET-09 `private-roles`) | P1 | ✅ ✅ ✅ |
| C-24 | `CodeInput` (mã OTP 6 số) | Thêm khi chuyển xác nhận email sang mã (17/10/2026). v1.9: dùng ở S-AUTH-03, S-AUTH-05 `reset-form`, S-ME-03 `password-code`; màn có ô mật khẩu không tự gửi | P1 | ✅ ✅ ✅ |
| C-35 🆕 | `InviteEmbed` (thẻ lời mời dưới tin nhắn) | v1.9, CR-19 #12; S-HOME-01 `invite-cards` | P1 | ✅ ✅ ✅ |
| C-36 🆕 | `MediaViewer` (xem ảnh, PDF, video toàn khung) | v1.9, CR-19 #8; S-HOME-11 | P2 | ✅ ✅ ✅ |
| C-37 🆕 | `TodayProgress` (thanh "Hôm nay N / 15 phút") | v1.9, CR-23; tab Học, Thống kê | P1 | ✅ ✅ ✅ |
| C-38 🆕 | `MonthCalendar` (lịch tháng có phút từng ngày) | v1.9, CR-23; S-STUDY-03 `month` | P2 | ✅ ✅ ✅ |
| C-39 🆕 | `SessionRow` (một dòng lịch sử phiên) | v1.9, CR-23; S-STUDY-03 "Lịch sử phiên" | P2 | ✅ ✅ ✅ |
| C-40 🆕 | `ActivityLine` (dòng hoạt động học: `short`, `full`, `block`) | v1.9, CR-24 #1, CR-25 #16; DMRow, MemberRow, FriendRow, header DM, hồ sơ S-HOME-10 | P1 | ✅ ✅ ✅ |
| C-41 🆕 | Logo, icon app & splash (chữ N của Runtime: icon launcher, adaptive icon, icon đơn sắc, splash sáng / tối) | CR-26 (01/11/2026), 3.x Icon app & splash | P1 | ✅ ✅ ✅ |
| OS | `OS/StatusBar`, `OS/Keyboard` (text, email, number), `OS/ShareSheet`, `OS/DatePicker`, `OS/TimePicker`, `OS/PermissionDialog` (thêm 21/10, area 10) | Chỉ để dựng frame; `OS/Keyboard` thêm khi viết 01; `OS/ShareSheet` khi viết 02. **18/10/2026:** status bar và thanh điều hướng đổi sang kiểu Android (DEC-30) | P1 | ✅ ✅ ✅ |
| C-19 | `StageView` (xem screen share) | v1.x, DEC-11 | P3 | ☐ ☐ ☐ |
| C-42 🆕 | `AdminSidebar` (+ `AdminNavItem`, menu tài khoản) | Web quản trị (CR-27, 01/11/2026) | P0 | ✅ ✅ ✅ |
| C-43 🆕 | `DataTable` (đầu cột, hàng, kiểu ô, rỗng / tải / lỗi) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-44 🆕 | `Pagination` (kiểu bản web) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-45 🆕 | `FilterBar` (ô tìm, lọc liền nút, lọc chọn) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-46 🆕 | `PageHeader`, `CasePager` | Web quản trị | P0 | ✅ ✅ ✅ |
| C-47 🆕 | `KeyValueStrip` (dải nhãn–giá trị) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-48 🆕 | `EvidenceFrame` (ảnh chụp tin / hồ sơ / server) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-49 🆕 | `SubjectCard` (người bị báo cáo + tình trạng) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-50 🆕 | `DecisionPanel` (lựa chọn, lý do, lời nhắn, ghi chú, biên nhận) | Web quản trị | P0 | ✅ ✅ ✅ |
| C-53 🆕 | `AdminDialog` (`confirm`, `type-name`, `discard`) | Web quản trị — W1 | P0 | ✅ ✅ ✅ |
| C-56 🆕 | `HistoryPopover` (lịch sử admin xử lý một người, tại chỗ) | Web quản trị — W1 | P0 | ✅ ✅ ✅ |
| C-51 🆕 | `StatStrip` (dải số Tổng quan, ô link) | Web quản trị — W3 (02/11/2026) | P0 | ✅ ✅ ✅ |
| C-52 🆕 | `LineChart`, `ColumnChart`, `StackedColumnChart`, `ChartTooltip`, `ChartTable`, `KpiTable` | Web quản trị — W3 (02/11/2026); "Xem dạng bảng" vào SRS REQ-ADMIN-02 | P0 | ✅ ✅ ✅ |
| C-55 | `NarrowBlock` | **Bỏ** (W4, 02/11/2026): không còn màn chặn dưới 1024 — trang cuộn ngang | — | — |
| C-54 | Toast web | **Bỏ** (W4, 02/11/2026): không thao tác nào của web cần toast — kết quả là biên nhận tại chỗ | — | — |

### 01 · Đăng nhập & Onboarding — `01-auth-onboarding.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-AUTH-00 | Cần cập nhật app (`42601`) | default | NFR-MOB-12 | P1 | ✅ ✅ ✅ |
| S-AUTH-01 | Welcome | default, pending-invite, pending-deletion-notice (thêm 21/10, area 07), large-text (+ default · light) | — | P1 | ✅ ✅ ✅ |
| S-AUTH-02 | Tạo tài khoản (nhập email) | default, field-error, back-to-edit, submitting, rate-limited 🆕, offline (v1.9: username, mật khẩu, checkbox, `large-text`, `· 360` chuyển sang S-ONB-01) | AUTH-01, AUTH-13 | P1 | ✅ ✅ ✅ |
| S-AUTH-03 | Nhập mã OTP (đăng ký và đăng nhập bằng OTP) | default, verifying, code-wrong (`40003`), too-many-attempts, code-expired (`40002`), resent, rate-limited, offline (v1.9: bỏ `verified`) | AUTH-01/02/13 | P1 | ✅ ✅ ✅ |
| S-AUTH-04 | Đăng nhập (chế độ OTP mặc định / mật khẩu) | default (OTP), password 🆕, keyboard-open, wrong-password, captcha (v1.x — MVP không CAPTCHA, 02/11/2026), rate-limited, suspended 🆕 (`40308`, v1.10 — lý do + lời nhắn, W1), pending-deletion, submitting, offline | AUTH-02, AUTH-10, SAFE-02 | P1 | ✅ ✅ ✅ |
| S-AUTH-05 | Quên / đặt lại mật khẩu (một màn) | request, rate-limited, reset-form, reset-keyboard 🆕, code-wrong (v1.9: bỏ `code`, `link-expired`) | AUTH-08 | P2 | ✅ ✅ ✅ |
| S-AUTH-EDGE | Edge case đăng nhập & onboarding (10 frame) | session-revoked, session-reuse 🆕, verify-network-error, code-autofill, update-mid-signup, long-email, long-server-name, timezone-custom, code-large-text, long-names 🆕 + 12 luật bằng chữ (01 › Edge case; v1.9 bỏ registration-expired, killed-back-to-edit, invite-banned) | AUTH-01/02/08/13, SRV-04, STUDY-03 | P1 | ✅ ✅ ✅ |
| S-AUTH-06 | 2FA, đăng nhập Google/Apple | — | AUTH-03/11/12 | P3 | ☐ ☐ ☐ |
| S-ONB-01 | Hoàn tất tài khoản (v1.9, CR-16 — giữ ID, thay "Chọn timezone & ngôn ngữ") | default (+ light, default · 360), scrolled, keyboard-open, username-taken (`40901`), username-taken-on-submit, field-error, timezone-picker, timezone-search-empty, english, offline, large-text | AUTH-01, AUTH-06, STUDY-03, NFR-I18N | P1 | ✅ ✅ ✅ |

S-ONB-02 (Bắt đầu: lời mời / tạo server / nhập mã) **đã bỏ ở v1.9** (CR-16 #5): hoàn tất tài khoản xong không có lời mời thì vào 02 S-HOME-02 `no-server`.

### 02 · Home & Chat — `02-home-chat.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-HOME-01 | Kênh text | default (+ light, · 360), loading, empty, error, offline, reconnecting, forbidden, timed-out, blocked-message, system-messages, welcome-channel 🆕, message-states, new-messages, scrolled-up, mention-suggest, mention-suggest-roles 🆕, reply-mode, edit-mode, keyboard-open, char-counter 🆕 (near, over), rate-limited, in-session, from-notification, message-link 🆕, nezfocus-links 🆕, invite-cards 🆕 (+ errors, max), link-previews 🆕, attachments 🆕 (v1.9: bỏ `no-history`) | MSG-*, ROLE-05, NOTIF-05 | P1 | ✅ ✅ ✅ |
| S-HOME-02 | Drawer trái (server rail + danh sách kênh) | default, no-server, focus-running, unread-mention, collapsed, loading, offline, no-connect, channel-menu (area 08), category-menu (P2, area 08), reordering (P2), drop-blocked 🆕, uncategorized (CR-11), reports-pending 🆕 | SRV-02, NOTIF-01, SAFE-01 | P1 | ✅ ✅ ✅ |
| S-HOME-03 | Drawer phải: Thành viên / Việc / Ghim | members, task-board, task-search 🆕, task-row-menu 🆕, task-empty, task-board-off, pins, pins-empty, loading, offline | STUDY-06, MSG-10, AUTH-05 | P1 | ✅ ✅ ✅ |
| S-HOME-04 | Action sheet tin nhắn (nhấn giữ) | own-message, others-message, moderator, system-message, failed-message, failed-file-blocked 🆕, timed-out, delete-confirm, embed-remove-confirm 🆕, emoji-picker | MSG-05/10, SAFE-01 | P1 | ✅ ✅ ✅ |
| S-HOME-05 | Đính kèm & tải lên | picking, uploading, checking 🆕, upload-failed, rejected 🆕 (fake-type, virus), unsupported 🆕, too-large, too-many (v1.9: bỏ `blocked-file`) | MSG-04 | P2 | ✅ ✅ ✅ |
| S-HOME-06 | Tạo / tham gia server (chọn template) | choose-template, name-server, creating, create-error, created, join-by-code, join-error, keyboard-open (name, code), offline, restore, restore-list (P2, area 08) (v1.9: bỏ `from-onboarding`) | SRV-01, STUDY-05 | P1 | ✅ ✅ ✅ |
| S-HOME-07 | Tạo & chia sẻ lời mời | loading, default (+ light), copied, edit-settings, revoked 🆕, share-sheet, room (STUDY-16), error, forbidden, offline | SRV-03, STUDY-16 | P1 | ✅ ✅ ✅ |
| S-HOME-08 | Chat của phòng voice (DEC-35) | default, not-in-room, empty, forbidden, members-drawer (còn lại như S-HOME-01) | MSG-*, DEC-35 | P1 | ✅ ✅ ✅ |
| S-HOME-09 | Menu server | member, owner, moderator 🆕, owner-leave, leave-confirm, leave-confirm-in-room 🆕, leave-confirm-host 🆕 | SRV-02/03/05, SAFE-01 | P1 | ✅ ✅ ✅ |
| S-HOME-10 | Hồ sơ thành viên (sheet) | not-friend, friend, request-sent, request-received (area 09), self, moderator, moderator-voice (P2, area 08), activity 🆕, menu 🆕, blocked 🆕, outside-server 🆕, outside-server-none 🆕, cannot-message, deleted | FRIEND-01..04, DM-01/02, AUTH-05/06 | P1 | ✅ ✅ ✅ |
| S-HOME-11 🆕 | Trình xem tệp (v1.9, CR-19 #8) | image (+ light), pdf, pdf-error, video, loading | MSG-04 | P2 | ✅ ✅ ✅ |
| S-HOME-EDGE | Edge case Home & Chat (12 frame) | kicked, banned, banned-in-room 🆕, removed-while-offline 🆕, channel-removed, long-names-drawer, long-names-chat, many-servers, long-message, alone-in-server, large-text-chat, large-text-drawer + 12 luật bằng chữ (02 › Edge case) | ROLE-05/07, SRV-02/05, MSG-01/02/05 | P1 | ✅ ✅ ✅ |

### 03 · Study Room & Room Session — `03-study-room.md` ⭐ vertical slice

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-ROOM-01 | Phòng voice chưa có phiên học | not-joined, camera-on-before-join 🆕, study-room-idle, not-study-room (`off`), managers-only, voice-video-grid, camera-self-preview, offline; study-room-idle · light, voice-video-grid · light (v1.9: bỏ `silent-joined`) | VC-01/05, STUDY-01/02/11 | P0 | ✅ ✅ ✅ |
| S-ROOM-02 | Phiên học đang chạy | focus-host, focus-participant, not-joined (xem trước), not-joined-other-session 🆕, just-joined (đang được tính giờ), late-join, short-break, long-break, paused, pending-config, no-host, no-host-paused 🆕, host-transferred, full-room, camera-available, grid-view, syncing, mod-muted, disconnected-by-mod (frame ở 08), large-text, long-focus-90, long-focus-120, focus-host · 360 | STUDY-01/11/15, VC-01 | P0 | ✅ ✅ ✅ |
| S-ROOM-03 | Sheet Bắt đầu phiên học | default (mặc định của phòng), custom, custom-long-break, invalid, submitting, solo-confirm 🆕, conflict, custom · 360 | STUDY-01/11 | P0 | ✅ ✅ ✅ |
| S-ROOM-04 | Sheet điều khiển phiên học (bỏ qua pha, sửa chu kỳ "áp dụng từ vòng sau", dừng) | host, moderator | STUDY-11 | P0 | ✅ ✅ ✅ |
| S-ROOM-05 | Dialog xác nhận của phiên học (dừng, tắt Phòng học, Host rời / chuyển phòng) | stop, focus-off, host-leave 🆕, host-switch 🆕, no-successor 🆕 | STUDY-11, VC-01 | P0 | ✅ ✅ ✅ |
| S-ROOM-06 | Dialog "Vào phòng sẽ kết thúc phiên học một mình" | default | STUDY-10 | P0 | ✅ ✅ ✅ |
| S-ROOM-07 | Notification chuyển pha (màn hình khóa) | lock-screen (một frame chứa cả 3 thông báo to-break, to-focus, solo-waiting) | STUDY-01/10 | P0 | ✅ ✅ ✅ |
| S-ROOM-08 | Mini-player trên các tab khác | room-session, solo, solo-waiting, voice-only, camera-on, paused 🆕, voice-solo 🆕 | 3.1 | P0 | ✅ ✅ ✅ |
| S-ROOM-09 | Xin quyền thông báo theo ngữ cảnh (màn hình giải thích) | first-focus, first-server, denied (không có màn riêng — luật bằng chữ ở 03) | NOTIF-02 | P0 | ✅ ✅ ✅ |
| S-ROOM-EDGE | Edge case Study Room (18 frame) | host-stopped, ended-self-host 🆕, ended-focus-off 🆕 (thay focus-off-by-other), ended-elsewhere 🆕, kicked, other-device, reconnected-gap, app-restart-rejoin 🆕, host-reconnecting 🆕, incoming-call, mic-denied, alone, streak-reached, host-left-paused, solo-stopped-by-room-start 🆕, left-room-toast 🆕, left-voice-toast 🆕, huge-room + 13 luật bằng chữ (03 › Edge case) | STUDY-01/03/11/15, VC-01 | P0 | ✅ ✅ ✅ |

### 04 · Tab Học — `04-tab-hoc.md` ⭐ vertical slice

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-STUDY-01 | Tổng quan tab Học | default (+ light, · 360), idle, cycle-sheet, long-cycle, many-rooms, no-active-rooms, no-server, never-studied (empty), streak-zero, solo-running, in-room-solo-blocked, loading, offline, large-text | STUDY-03/10, 3.1 | P0 | ✅ ✅ ✅ |
| S-STUDY-02 | Học một mình (Solo Session) | focus, short-break, long-break, paused, waiting (Học tiếp), ended-summary, ended-expired, edit-cycle-sheet, pending-config, offline, exact-alarm-off, friends-sheet, waiting · 360 | STUDY-10/15 | P0 | ✅ ✅ ✅ |
| S-STUDY-03 | Thống kê (Tuần / Tháng, lịch sử phiên) | default (+ light), streak-milestone (mascot), empty, streak-zero, previous-week 🆕, month 🆕 (+ light, · 360), history-loading 🆕, history-error 🆕, offline 🆕 | STUDY-03/15/17 | P1 | ✅ ✅ ✅ |
| S-STUDY-06 | Đang học lúc này — tất cả phòng | default, all-ended | 3.1 | P0 | ✅ ✅ ✅ |
| S-STUDY-EDGE | Edge case tab Học (17 frame) | room-ended-on-join, lost-access, stopped-other-device, notif-denied, too-short, long-session, many-friends, many-friends-sheet, long-names, streak-huge, streak-huge-stats, week-spike, empty-week, midnight, midnight-history 🆕, history-rules 🆕, year-boundary 🆕 + 8 luật bằng chữ (04 › Edge case) | STUDY-03/10/15/17, 3.1 | P0 | ✅ ✅ ✅ |
| S-STUDY-04 | Leaderboard server | enabled, hidden-self, disabled | STUDY-04 | P3 | ☐ ☐ ☐ |
| S-STUDY-05 | Study Event (danh sách & chi tiết) | upcoming, interested, live, ended | STUDY-12 | P3 | ☐ ☐ ☐ |

### 05 · Việc cần làm — `05-viec-can-lam.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-TASK-01 | Việc cần làm | default (Quá hạn / Hôm nay / 7 ngày tới / Sau đó / Không hạn / Đã xong) (+ light, · 360), loading, empty, all-done, offline, filter-server, done-expanded, marked-done, marked-doing 🆕, reopened, search 🆕, search-empty 🆕, row-menu 🆕 | STUDY-08, STUDY-06 | P1 | ✅ ✅ ✅ |
| S-TASK-02 | Chi tiết việc | assignee, creator, viewer ("Tôi làm"), unassigned, lost-access-assignee, history, delete-confirm, lost-access, loading, offline (v1.9: hàng Người tạo) | STUDY-06 | P1 | ✅ ✅ ✅ |
| S-TASK-03 | Thêm / sửa việc (chọn nhiều Assignee, deadline) | create, filled, edit, keyboard-open, deadline-sheet, assignee-picker, invalid-assignee (`40016`), date-picker, time-picker, saving, past-due | STUDY-06 | P1 | ✅ ✅ ✅ |
| S-TASK-EDGE | Edge case Việc cần làm (10 frame) | removed-while-viewing, board-disabled, offline-create-failed, many-tasks, many-done 🆕, long-title-list, long-title-detail, many-assignees, large-text-list, large-text-detail + 13 luật bằng chữ (05 › Edge case) | STUDY-06/08, DEC-25 | P1 | ✅ ✅ ✅ |

### 06 · Thông báo — `06-thong-bao.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-NOTI-01 | Hộp thư thông báo | default (mention, reply, kết bạn có lời nhắn, nhắc hạn, giao việc, báo cáo, cuộc gọi nhỡ — Study Event là v1.x, mời vào phòng là Backlog DEC-36) (+ light, · 360), loading, empty, error, offline, push-denied, all-read, new-arrived, friend-accepted, end-of-list, report-reviewed 🆕, reports-pending 🆕 (góc nhìn Bình), profile-reset 🆕 (góc nhìn Nam, W1), server-removed 🆕 (góc nhìn Khánh, W1) | NOTIF-01/02/05, SAFE-01, ADMIN-03/05 | P1 | ✅ ✅ ✅ |
| S-NOTI-EDGE | Edge case Thông báo (6 frame) | message-deleted, lost-access-tap, invite-cancelled, many-unread, long-content, large-text + 18 luật bằng chữ (06 › Edge case) | NOTIF-05, FRIEND-01/02, ROLE-08 | P1 | ✅ ✅ ✅ |

### 07 · Cá nhân & Cài đặt — `07-ca-nhan-settings.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-ME-01 | Sửa hồ sơ | default, editing, avatar-sheet, crop, uploading, upload-error, discard-confirm, offline (`name-empty` không vẽ riêng) | AUTH-06 | P2 | ✅ ✅ ✅ |
| S-ME-02 | Cá nhân (màn gốc tab: hồ sơ, trạng thái, cài đặt, đăng xuất) | default, status-sheet, invisible, logout-confirm, logout-confirm-host 🆕, offline | 3.1, AUTH-05/07 | P2 | ✅ ✅ ✅ |
| S-ME-03 | Tài khoản: mật khẩu, phiên đăng nhập, xóa tài khoản | default, password-form, password-keyboard, password-wrong, password-code 🆕, password-code-wrong 🆕, password-saved, sessions, revoke-confirm, sessions-single, delete-blocked-owner (`40010`), delete-confirm, offline (+ S-AUTH-01 `pending-deletion-notice`) | AUTH-07/08/10/14 | P2 | ✅ ✅ ✅ |
| S-ME-04 | Quyền riêng tư | default, dm-off, activity-off 🆕 (thay `solo-visible-on`), save-error, offline (danh sách chặn → S-DM-04 `blocked`) | DM-02, AUTH-05, STUDY-10 | P2 | ✅ ✅ ✅ |
| S-ME-05 | Thông báo (Server ưu tiên, Chế độ Học tập ở v1.x) | default, push-denied, hide-preview-on, phase-sound-on, test-sound-silent 🆕, android-settings (frame hệ thống), offline | NOTIF-02, 3.4 | P2 | ✅ ✅ ✅ |
| S-ME-06 | Giao diện, ngôn ngữ, timezone | default, light, english, timezone-picker, timezone-confirm, timezone-rate-limited, offline | 3.3, STUDY-03 | P2 | ✅ ✅ ✅ |
| S-ME-EDGE | Edge case Cá nhân & Cài đặt (6 frame) | session-revoked-here, long-name-card, long-profile-edit, many-sessions, many-owned, large-text-root + 12 luật bằng chữ (07 › Edge case) | AUTH-06/07/10, STUDY-03, NFR-A11Y-03 | P2 | ✅ ✅ ✅ |

### 08 · Cài đặt Server & kênh — `08-server-channel-settings.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-SET-01 | Cài đặt server (danh sách mục + Tổng quan) | owner, moderator, overview, welcome-picker 🆕, welcome-off 🆕, overview-editing, overview-name-error, overview-icon-uploading, offline | 3.2, SRV-01/05 | P2 | ✅ ✅ ✅ |
| S-SET-02 | Vai trò | list, reorder, create-sheet, create-name-taken 🆕, edit-role, edit-role-name-taken 🆕, edit-role-middle, edit-role-lower, everyone, hierarchy-blocked, role-readonly, permission-locked, permission-locked-lower, admin-on, role-members, role-members-add, delete-confirm, limit, save-error, offline | ROLE-01/02/04, CR-10 | P2 | ✅ ✅ ✅ |
| S-SET-03 | Thành viên & kiểm duyệt (gán role, tạm khóa / mời ra / cấm) | list, search, search-empty, member-detail, member-blocked, timed-out, timeout-sheet, timeout-sheet-in-room 🆕, timeout-change-sheet 🆕, kick-confirm, ban-confirm, ban-keyboard, done, `*-from-report` (biến thể), save-error, offline | ROLE-04/05/07, CR-10 | P2 | ✅ ✅ ✅ |
| S-SET-04 | Lời mời & Danh sách cấm (2 màn) | invites, invite-actions 🆕, invites-empty, revoke-confirm, bans, bans-empty, ban-detail, unban-confirm, offline | SRV-03, ROLE-07, CR-10 | P2 | ✅ ✅ ✅ |
| S-SET-05 | Báo cáo (moderator, gom theo đối tượng) | pending, empty, evidence, act-sheet 🆕, act-timeout 🆕, act-ban 🆕, delete-confirm, message-gone, user-report, user-report-done, handled, deleted-in-channel 🆕, member-status 🆕, handled-by-other, handled-by-admin 🆕 (W1), offline | SAFE-01, CR-10, ADMIN-03 | P2 | ✅ ✅ ✅ |
| S-SET-06 | Cài đặt kênh: Tổng quan, Quyền, Task Board, danh mục | voice, voice · study-rooms-only, overview, editing, name-error, discard-confirm, delete-confirm, deleted, offline (kênh voice); text, welcome-text 🆕, welcome-delete-confirm 🆕, text-overview, name-taken 🆕, taskboard-off 🆕 (thay `taskboard-off-confirm`), overwrites, overwrites-synced, overwrite-edit, overwrite-edit-voice, add-target, category-rename, category-rename-taken 🆕, category-overwrites, category-delete-confirm, category-delete-blocked 🆕 (P2) | SRV-02, ROLE-03, STUDY-06, CR-10 | P2 | ✅ ✅ ✅ |
| S-SET-07 | Cài đặt kênh › **Phòng học** (ai được bắt đầu phiên học, cấu hình mặc định) | loading, full-access, managers, off, switch-off-confirm, cycle-sheet, cycle-custom, cycle-invalid, save-error, offline (v1.9: bỏ `study-rooms-only` và nhóm Âm thanh) | STUDY-11, STUDY-01/02 | P1 | ✅ ✅ ✅ |
| S-SET-EDGE | Edge case S-SET-07 & S-SET-06 kênh voice (5 frame) | changed-by-other, long-name-hub, long-name-overview, large-text, long-cycle-360 + 11 luật bằng chữ (08 › Edge case) | STUDY-01/11, SRV-02 | P1 | ✅ ✅ ✅ |
| S-SET-08 | Chuyển quyền Owner, xóa server | transfer-picker, transfer-search, transfer-alone, transfer-confirm (S-MOD-03 `password`), transferred, transferred-leave, delete-confirm (S-MOD-03 `type-name`), deleted (khôi phục: S-HOME-06 `restore`) | SRV-05 | P2 | ✅ ✅ ✅ |
| S-SET-09 | Tạo kênh / danh mục (sheet) | text, text-slug, voice, voice-off 🆕, category, name-error, name-taken 🆕, private 🆕, private-roles 🆕, private-self-warning 🆕, limit, created, category-picker | SRV-02, STUDY-05/11, ROLE-03 | P2 | ✅ ✅ ✅ |
| S-SET-EDGE (P2) | Edge case P2 Cài đặt server (10 frame) | moderation-inbox, owner-transferred-inbox, disconnected-by-mod, timed-out-voice, long-role-name, long-ban-reason, edit-role-large-text, overwrite-large-text, overwrite-360, roles-empty + 16 luật bằng chữ (08 › Edge case P2) | ROLE-01/05, VC-04, NOTIF-05, NFR-A11Y-03 | P2 | ✅ ✅ ✅ |

### 09 · DM, bạn bè & cuộc gọi — `09-dm-friends-call.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-DM-01 | Tin nhắn (danh sách DM trong drawer trái) | default (+ · 360), empty, loading, offline, close-dm | DM-01/03, NOTIF-01, AUTH-05 | P1 | ✅ ✅ ✅ |
| S-DM-04 | Bạn bè (Trực tuyến / Tất cả / Đang chờ / Đã chặn) | online, all (+ · 360), pending, pending-sent 🆕, pending-empty 🆕, blocked, search, empty, empty-online, row-menu, unfriend-confirm, block-confirm, offline | FRIEND-01..04, AUTH-05 | P1 | ✅ ✅ ✅ |
| S-DM-05 | Thêm bạn bằng username (sheet: tra cứu → thẻ hồ sơ → gửi kèm lời nhắn) | default, keyboard-open, looking-up 🆕, card 🆕, card-friend 🆕, card-sent 🆕, card-received 🆕, card-blocked 🆕, sending, sent, error, lookup-limited 🆕, auto-accepted | FRIEND-01 | P1 | ✅ ✅ ✅ |
| S-DM-02 | DM 1-1 / Group DM | default (+ light, · 360), group, new-dm, not-friend, not-friend-sent 🆕, cannot-message (`40303`), blocked-by-me, deleted-account, call-leave-room, call-active (+ state của S-HOME-01) | DM-01..03, GDM-01..03, FRIEND-03 | P1 | ✅ ✅ ✅ |
| S-DM-03 | Tạo nhóm / thêm vào nhóm | picker, picker-empty, limit-reached (`40052`), add-to-group, creating, no-friends | GDM-01/02/03 | P2 | ✅ ✅ ✅ |
| S-DM-06 | Thông tin nhóm | member, owner, rename, member-menu, remove-confirm, leave-confirm, owner-leave-confirm | GDM-02/03 | P2 | ✅ ✅ ✅ |
| S-CALL-01 | Màn hình cuộc gọi | calling, calling-video, connecting, in-call-audio (+ light, · 360), camera-on, minimized, minimized-video 🆕, tile-menu 🆕, in-call-video, muted, peer-camera-off, reconnecting, connect-failed 🆕, declined, busy, no-answer, ended, mic-denied | DMVC-01/03 | P1 | ✅ ✅ ✅ |
| S-CALL-02 | Cuộc gọi đến | foreground, video, notification, in-room (dùng sheet 03), caller-cancelled | DMVC-01/03, NOTIF-02 | P1 | ✅ ✅ ✅ |
| S-DM-EDGE | Edge case DM, bạn bè & cuộc gọi (8 frame, gồm 2 frame `S-CALL-EDGE`) | blocked-mid-chat, removed-from-group, call-dropped, long-names, long-names-dm-header, long-names-call, large-text-friends, large-text-call + 21 luật bằng chữ (09 › Edge case) | FRIEND-03/04, GDM-02, DMVC-01/04 | P1 | ✅ ✅ ✅ |

### 10 · Modal & overlay — `10-modals-overlays.md`

| ID | Màn hình | State chính | REQ | Ưu tiên | Spec/Vẽ/Duyệt |
|---|---|---|---|---|---|
| S-MOD-01 | Preview lời mời | loading, valid, room-invite (`?channel=`), **guest** (chưa đăng nhập: "Tạo tài khoản để tham gia" / "Đăng nhập"), joining, expired (`40041`), banned (`40306`), max-servers (`40011`), already-member (bỏ qua preview + toast), members-only (STUDY-16 AC4), offline | SRV-04/07, STUDY-16 | P1 | ✅ ✅ ✅ |
| S-MOD-02 | Báo cáo vi phạm (sheet) | choose-reason, reason-selected, missing-reason, keyboard-open, sending, sent (kèm "Chặn"), sent-server (kèm "Rời server"), rate-limited (`40029`), target-user (báo cáo hồ sơ), target-server, error | SAFE-01 | P2 | ✅ ✅ ✅ |
| S-MOD-03 | Xác nhận thao tác nguy hiểm (mẫu chung, sheet) | type-name, type-name-match, type-name-keyboard, password, password-keyboard, password-wrong (`40102`), password-rate-limited 🆕, password-reset-done 🆕, submitting, error | 3.4, SRV-05, AUTH-10/14 | P2 | ✅ ✅ ✅ |
| S-MOD-04 | Toast & banner hệ thống (luật vị trí, ưu tiên, hàng đợi) | reconnecting, offline (dùng lại S-HOME-01), rate-limited (toast), stacked, toast-keyboard, catalog | 3.4, 3.5 | P1 | ✅ ✅ ✅ |
| S-MOD-05 | Thiếu quyền hệ điều hành (mic, camera; thông báo ở S-ROOM-09) | mic (chạm Mic ở màn xem trước phòng), mic-system, mic-blocked, mic-blocked-call (thay dialog tạm ở S-CALL-01), camera, camera-blocked (`notifications`, `returned-from-settings`: luật bằng chữ, không frame) | 3.5, NFR-MOB-10 | P1 | ✅ ✅ ✅ |
| S-MOD-EDGE | Edge case Modal & overlay (4 frame) | expired-on-join, large-text-invite, large-text-report, large-text-confirm + 19 luật bằng chữ (10 › Edge case) | SRV-03/04/07, SAFE-01, NFR-MOB-10, NFR-A11Y-03 | P1 | ✅ ✅ ✅ |

### Web quản trị (CR-27) — các area, đề xuất 01/11/2026

Nền tảng **web** (khung 1440 × 900, kiểm thêm 1024 × 768; `DESIGN.md` › Web quản trị). Mã màn hình `S-ADM-*`. File spec đặt tên `wN-*.md` để tách khỏi các area của app.

| Area | File | Màn hình | REQ | Spec/Vẽ/Duyệt |
|---|---|---|---|---|
| W1 · Báo cáo ⭐ (vertical slice của web quản trị) | `w1-bao-cao.md` | S-ADM-RPT-01 Hàng đợi (Đang chờ / Đã xử lý) · S-ADM-RPT-02 Xử lý một việc (tin / hồ sơ / server) | REQ-ADMIN-03, REQ-SAFE-01/02 | ✅ ✅ ✅ |
| W1-EDGE · Báo cáo — edge case | `w1-bao-cao.md` › Edge case | 10 frame: subject-deleted, reporter-deleted, server-deleted-by-owner, stale-open-handled, message-deleted-before-confirm, new-report-while-open, many-reports, long-username, queue-crowded, replace-permanent + 9 luật bằng chữ | REQ-ADMIN-01/03/05, SAFE-01, DEC-28 | ✅ ✅ ✅ |
| W2 · Người dùng & Server | `w2-nguoi-dung-server.md` | S-ADM-USR-01 Danh sách · S-ADM-USR-02 Chi tiết người dùng · S-ADM-SRV-01 Danh sách · S-ADM-SRV-02 Chi tiết server (+ dialog Gỡ server) | REQ-ADMIN-04/05 | ✅ ✅ ✅ |
| W2-EDGE · Người dùng & Server — edge case | `w2-nguoi-dung-server.md` › Edge case | 12 frame: locked-by-other, renamed-while-confirming, long-username (list, detail), long-server-name (list, confirm), many-items (+ scrolled), big-numbers (users, servers), owner-of-many; sửa `pending-deletion` (E0) + 10 luật bằng chữ | REQ-ADMIN-01/04/05, AUTH-10, SAFE-02 | ✅ ✅ ✅ |
| W3 · Tổng quan & Nhật ký | `w3-tong-quan-nhat-ky.md` | S-ADM-OVR-01 Tổng quan · S-ADM-LOG-01 Nhật ký quản trị | REQ-ADMIN-02/06, 2.7 | ✅ ✅ ✅ |
| W3-EDGE · Tổng quan & Nhật ký — edge case | `w3-tong-quan-nhat-ky.md` › Edge case | 5 frame: stale-next-day, big-numbers (K), spike-and-gap (P), long-names (H), admin-renamed (M) + 16 luật bằng chữ; kéo theo: đơn vị trục "giờ" thành chú thích của chú giải | REQ-ADMIN-01/02/04/06, SRV-05 | ✅ ✅ ✅ |
| W4 · Đăng nhập & khung | `w4-dang-nhap.md` | S-ADM-AUTH-01 Đăng nhập (+ phiên kết thúc theo lý do) · dưới 1024 cuộn ngang (thay S-ADM-AUTH-02 Màn chặn — bỏ) · S-ADM-APP-01 Khung: khởi động, trang lỗi, menu tài khoản đang mở 🆕 · + `S-ADM-RPT-02 · draft-restored` | REQ-ADMIN-01, 4.11 | ✅ ✅ ✅ |
| W4-EDGE · Đăng nhập & khung — edge case | `w4-dang-nhap.md` › Edge case | 1 frame: session-disabled (D) (+ captcha-error ghi v1.x) + 16 luật bằng chữ | REQ-ADMIN-01, REQ-AUTH-02 | ✅ ✅ ✅ |

## Thứ tự làm đề xuất

1. `00-components.md` — các component P0 ✅ (16/10/2026).
2. **Vertical slice:** `03-study-room.md` + `04-tab-hoc.md` (P0) → duyệt cả hai theme → chỉnh `DESIGN.md` nếu cần.
3. Các màn hình P1 theo flow demo: 01 → 02 → 05 → 06 → 09 → 10 → S-SET-07.
4. Các màn hình P2 ✅ (22/10/2026), sau đó P3.
5. Đợt v1.9 (30/10/2026): vẽ lại theo worklist canvas — component (00) trước, rồi các area; duyệt xong thì đổi ◐ thành ✅ ở danh mục trên và ở `00-components.md`.

## Phần để sau (dừng thiết kế mobile ngày 22/10/2026)

Chủ dự án dừng thiết kế mobile sau khi duyệt hết P1 và P2. Phần dưới đây **chưa có spec, chưa có frame**; làm tiếp bằng `/ui-feature-spec-vi` khi các tính năng này vào phạm vi.

### Màn P3 chưa làm
| Màn | REQ | Đã biết | Chỗ đã chừa sẵn trong thiết kế |
|---|---|---|---|
| S-AUTH-06 · 2FA, đăng nhập Google / Apple | AUTH-03, AUTH-11, AUTH-12 | TOTP + 10 mã khôi phục; Google và Apple làm cùng lúc; email OAuth trùng tài khoản → liên kết (`40906`) | 01 Đăng nhập (chưa có nút Google/Apple, chưa có bước mã 2FA); 07 S-ME-03 Tài khoản (chưa có hàng 2FA); xác nhận nguy hiểm 10 S-MOD-03 `password` dùng thêm TOTP khi đã bật 2FA (SRV-05) |
| S-STUDY-04 · Leaderboard server | STUDY-04 | Mặc định tắt, Owner / `MANAGE_SERVER` bật; tuần / tháng theo local day; chỉ tính phút Room Session; user ẩn tên bằng một cài đặt chung | 08 S-SET-01 (hàng "Study settings" đang ẩn); 07 S-ME-04 (cài đặt "ẩn khỏi leaderboard" — kiểm lại khi làm); 04 tab Học |
| S-STUDY-05 · Study Event | STUDY-12 | Lịch hẹn học lặp theo tuần (≤ 12 tuần), "Quan tâm", push 15 phút trước, tự bắt đầu Focus; luật khung giờ sự kiện ở STUDY-12 | 08 S-SET-01 (hàng "Events" đang ẩn); 06 loại thông báo `event_reminder` (v1.x); 03 tin hệ thống "Buổi học đã kết thúc" |
| C-19 · `StageView` (xem chia sẻ màn hình) | VC-03, DEC-11 | Một luồng chiếm vùng Stage, ghi tên người chia sẻ, xoay ngang; Android phát, iOS chỉ xem | 03 phòng học (chưa có nút chia sẻ màn hình) |

### Tính năng đã dời sang v1.x trong lúc thiết kế (giao diện chưa có)
| Tính năng | Quyết định | Nơi ghi |
|---|---|---|
| Ảnh bìa, màu nhấn, biệt danh theo server | v1.x | CR-09 mục 1 (SRS v1.7) |
| Analytics và công tắc tắt analytics; xuất dữ liệu | v1.x | CR-09 mục 7, 8 |
| Màu vai trò, hoist | v1.x | CR-10 mục 1 |
| Tự tắt loa, mod-deafen (nút Loa trong phòng) | v1.x | CR-10 mục 3 |
| Audit Log, mô tả server | v1.x / không có màn | CR-10 mục 11, REQ-ROLE-06 (chọn kênh tin chào mừng đã có ở v1.9: 08 S-SET-01 `welcome-picker`) |
| Server ưu tiên, Chế độ Học tập, mức thông báo theo server | v1.x | 07 S-ME-05 |

### SRS
- Không còn. CR-11 (kênh không có danh mục) đã gộp vào **SRS v1.8** ngày 23/10/2026 (Phụ lục 11.12); CR-12 → CR-25 (backport từ bản web) gộp vào **SRS v1.9** ngày 30/10/2026 (Phụ lục 11.13), spec sửa theo ngày 30–31/10/2026.
