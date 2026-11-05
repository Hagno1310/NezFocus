# Quy trình làm việc (2 người + agent)

File này trả lời: **làm một việc từ đầu đến cuối như thế nào**. Ai làm việc gì và theo thứ tự nào: [`task-breakdown.md`](task-breakdown.md). Luật bắt buộc: [`AGENTS.md`](../AGENTS.md). Khi mâu thuẫn: SRS → `AGENTS.md` → file này → mặc định của skill.

## 1. Chuẩn bị (mỗi máy, một lần)

| Việc                                                                                           | Ghi chú                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cài repo, dev client, chạy được app trên điện thoại                                            | [`getting-started.md`](getting-started.md)                                                                             |
| `gh auth login`                                                                                | Agent tạo / đọc / đóng issue bằng `gh`                                                                                 |
| Cài app Pen (pen.dev), cấu hình MCP `pencil` cho agent, mở `Des/nezfocus.pen` khi làm màn hình | Để agent chụp frame. Không cài được thì nhờ người kia xuất ảnh frame đính vào ticket                                   |
| Agent nhận skill trong `.claude/skills/` (bộ Matt Pocock, phiên bản ghi ở `skills-lock.json`)  | Máy có cài bộ skill khác (vd `agent-skills:*`) thì **không dùng trong repo này**, để hai người chạy cùng một quy trình |

## 2. Skill nào dùng lúc nào

Gõ lệnh skill là việc của người; phần lớn skill này không tự chạy.

| Lúc                                                                                          | Skill                                                                       |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Biến một giai đoạn trong `task-breakdown.md` hoặc một spec thành ticket có quan hệ chặn nhau | `/to-tickets`                                                               |
| SRS / spec chưa rõ, cần chốt trước khi làm                                                   | `/grilling`; cần ghi thuật ngữ mới vào `GLOSSARY.md` thì `/grill-with-docs` |
| Gom một cụm việc đã bàn thành spec trên GitHub                                               | `/to-spec`                                                                  |
| Làm một issue cha (mặc định, mục 5) hoặc một ticket lẻ                                       | `/implement #<số>` (tự gọi `/tdd`, `/code-review`)                          |
| Làm các ticket con của một issue cha song song (mục 6)                                       | `/implement-spec #<số issue cha>`                                           |
| Test trước, code sau cho từng AC                                                             | `/tdd`                                                                      |
| Review thay đổi so với `main` (chuẩn của repo + đúng ticket)                                 | `/code-review`                                                              |
| Viết mô tả PR                                                                                | `/pr`                                                                       |
| Lỗi khó, lỗi chập chờn, chậm                                                                 | `/diagnosing-bugs`                                                          |
| Phiên dài, chuyển sang phiên mới                                                             | `/handoff`                                                                  |
| Lỗi / yêu cầu mới từ pilot cần phân loại                                                     | `/triage`                                                                   |
| Thử nhanh một ý tưởng UI / state rồi bỏ                                                      | `/prototype`                                                                |

## 3. Từ kế hoạch tới ticket

**Ticket của P0–P4 đã có sẵn** (05/11/2026): viết từ `task-breakdown.md` theo cùng luật của `/to-tickets` (lát cắt dọc, mỗi ticket vừa một phiên agent, ghi quan hệ chặn nhau) cộng phần riêng của dự án (màn hình + trạng thái + frame, các bước 👤 / 🤖), rồi đăng hàng loạt lên GitHub Issues bằng script: milestone = giai đoạn, issue cha (nhãn `spec`) = một dòng task, issue con = ticket. Quy ước body: [`agents/issue-tracker.md`](agents/issue-tracker.md).

**Việc mới về sau** (lỗi pilot, tính năng thêm, việc tách ra khi làm): `/grilling` chốt chỗ chưa rõ → `/to-spec` (nếu là cả một cụm) → `/to-tickets`. Ticket do `/to-tickets` tạo phải theo cùng quy ước body, lấy một issue đã có cùng loại làm mẫu (ticket backend, ticket màn hình, ticket hợp đồng).

Khi SRS hoặc spec đổi: sửa luôn các ticket chưa đóng có chép AC / trạng thái bị ảnh hưởng (SRS vẫn là nguồn).

**Chọn việc: nhìn [`tien-do.md`](tien-do.md), không cần lọc trên GitHub.** Mỗi dòng ở đó là một phiên agent (một issue cha hoặc một ticket đứng riêng), xếp theo thứ tự nên làm cho từng người. Luật ngắn:

1. Giai đoạn hiện tại, cột của mình, từ trên xuống; dòng **làm được** khi mọi mục "Cần trước" đã tick.
2. Dòng có "Trong lúc làm" vẫn bắt đầu được: ticket con đó chờ người kia, dùng Fake hoặc bỏ qua (mục 5).
3. Ô "mốc" (hợp đồng, hoặc ticket người kia đang chờ) làm và merge sớm.
4. Hết việc ở giai đoạn này: làm trước giai đoạn sau, hoặc bàn với người kia để cân lại.

Quan hệ chặn trên GitHub là bản đồ chi tiết cho agent (ticket con nào cần gì). Phần lớn là thứ tự **trong** một issue cha, agent tự làm lần lượt trong một phiên; chỉ quan hệ giữa hai người mới làm ai đó phải chờ, và `tien-do.md` đã ghi sẵn các chỗ đó.

**Tick `tien-do.md` trong chính PR đóng việc đó** (agent sửa file lúc chạy `/pr`; ô "mốc" hợp đồng tick trong PR hợp đồng), nên ô đã tick = đã merge vào `main`. Việc mới thêm sau (mục trên) thì thêm dòng vào `tien-do.md` trong cùng PR tạo ticket.

## 4. Không phải chờ nhau: hợp đồng và dữ liệu giả

**Hợp đồng = schema zod trong `packages/shared`** (SRS 5.3: nguồn duy nhất, dùng cả ở app). Không viết API docs riêng; OpenAPI sinh từ code ở cuối (DoD, SRS 9.6).

- Đặt theo mảng: `packages/shared/src/<mảng>/` (vd `auth/`, `servers/`, `gateway/events.ts`), export qua `index.ts`.
- Task có API / event mà người kia sẽ dùng thì **làm ticket hợp đồng trước**: request / response zod, endpoint, mã lỗi, payload event Gateway. PR riêng vào `main`, người kia review, merge sớm.

| Chỗ thiếu                                | Dùng tạm                                                                                                                                                                                                  | Ai viết                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| App gọi API chưa có                      | `src/data/<mảng>/Fake<X>Repository.ts` implement interface trong `src/domain/<mảng>/`, bật bằng `EXPO_PUBLIC_FAKE=<mảng>,<mảng>`. Dữ liệu = dữ liệu mẫu của spec. Đổi giả ↔ thật không phải sửa màn hình | Người làm màn hình              |
| App cần event real-time chưa có          | `FakeGatewayClient` phát event theo kịch bản                                                                                                                                                              | B (P0-5)                        |
| Backend cần dữ liệu của module người kia | Script seed dev theo dữ liệu mẫu; chủ module thêm bảng của mình vào seed                                                                                                                                  | A khởi tạo (P0-7)               |
| Backend gọi module người kia chưa xong   | Interface + bản tạm: `EventPublisher` (ghi log), `PermissionService` (dev: cho phép hết), `NotificationService.create` (ghi log)                                                                          | Chủ module viết interface trước |

**Task chỉ xong khi đã nối với hàng thật**: phần người kia xong thì tắt Fake / bản tạm và chạy lại luồng.

## 5. Đường ngắn (mặc định): một phiên agent cho một issue cha

Mỗi issue cha (nhãn `spec`) là một dòng task trong `task-breakdown.md`, gồm vài ticket con. Mặc định **một phiên agent làm trọn một issue cha**: các ticket con lần lượt, mỗi ticket con một commit, cuối cùng một PR. Ticket không có issue cha (vd P0-6) thì một phiên cho một ticket, cùng các bước dưới đây.

Issue cha ghi sẵn ở mục **Bắt đầu**: thứ tự ticket con, ticket hợp đồng nào phải dừng để merge sớm, ticket con nào đang chờ người kia, và có nên chia 2 phiên không. Mỗi ticket con có mục **Các bước** gắn 👤 (người) / 🤖 (agent).

| Bước | Ai             | Việc                                                                                                                                                                                                                                                                  |
| ---- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 👤             | Chọn issue cha có ticket con đầu tiên đã sẵn sàng, mở phiên agent mới, gõ `/implement #<số issue cha>`                                                                                                                                                                |
| 2    | 🤖             | Gán issue cho người đang làm, tạo branch `<loại>/<số issue cha>-<mo-ta>` từ `main` mới nhất; với từng ticket con theo thứ tự: đọc ticket và mục Nguồn, chụp frame qua pen.dev nếu có màn hình (mục 7), đối chiếu với code hiện tại và SRS (lệch thì sửa ticket trước) |
| 3    | 🤖 → 👤        | Chỗ chưa rõ thì hỏi (`/grilling`); người trả lời; agent ghi câu trả lời vào tài liệu (mục 8)                                                                                                                                                                          |
| 4    | 🤖             | `/tdd` từng AC của ticket con; màn hình dựng từ `shared/ui`, dùng Fake nếu phần người kia chưa xong (mục 4); chạy lint, typecheck, test; **commit**; tích AC trên ticket con; sang ticket con kế tiếp                                                                 |
| 5    | 🤖 ⏸ 👤       | **Ticket hợp đồng:** agent dừng để người push và mở PR riêng cho hợp đồng (người kia review sớm); agent làm tiếp trên branch nối từ branch hợp đồng, không chờ merge. **Ticket con đang chờ người kia mà không có Fake:** agent bỏ qua, báo lại, làm ticket kế tiếp   |
| 6    | 🤖             | Hết ticket con: cập nhật branch từ `main` (chưa push nên được rebase), chạy lại lint / typecheck / test (thêm e2e nếu chạm DB), `/code-review` so với `main` rồi sửa                                                                                                  |
| 7    | 🤖 → 👤        | Báo cáo AC đạt / chưa của từng ticket con và **liệt kê việc người cần làm**                                                                                                                                                                                           |
| 8    | 👤             | Làm các bước 👤 của từng ticket con: thử trên điện thoại (web quản trị: trình duyệt) so frame ở từng trạng thái; build lại dev client nếu có thư viện native. Lệch thì bảo agent sửa                                                                                  |
| 9    | 👤             | Push, bảo agent mở **một PR** (`/pr`, `Closes` từng ticket con, AC đạt / chưa, ảnh cạnh frame); 🤖 tick dòng của issue cha (và ô "mốc" của nó) trong `tien-do.md`, commit vào PR này                                                                                  |
| 10   | 👤 (người kia) | Review từng commit, CI xanh → Squash and merge; các ticket con tự đóng                                                                                                                                                                                                |

- **Issue cha lớn** (từ 5 ticket con): mục Bắt đầu gợi ý chỗ chia 2 phiên. Phiên dài thì agent kém chú ý tới phần đầu, nên khi context đã nặng: `/handoff`, mở phiên mới, gõ lại `/implement #<số issue cha>` (agent bỏ qua ticket con đã xong).
- **Cần làm gấp một phần** (vd người kia đang chờ đúng một ticket con): mở riêng ticket con đó, `/implement #<số ticket con>`, một PR riêng.

## 6. Đường dài: chạy song song bằng `/implement-spec`

Dùng thay mục 5 khi issue cha có nhiều ticket con không phụ thuộc nhau (vd P0-4 sau khi P0-4.1 xong).

| Bước | Ai      | Việc                                                                                                                                                                                     |
| ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 👤      | Làm trước các ticket con mà những ticket khác cần (ticket hợp đồng, ticket đầu tiên) theo mục 5                                                                                          |
| 2    | 👤      | Mở phiên agent mới, gõ `/implement-spec #<số issue cha>`                                                                                                                                 |
| 3    | 🤖      | Tạo integration branch `feat/<số issue cha>-<mo-ta>`; mỗi ticket con một agent trong một worktree, làm bằng `/tdd`; xong thì gộp vào integration branch; cuối cùng `/code-review` và sửa |
| 4    | 🤖 → 👤 | Báo cáo AC đạt / chưa của từng ticket con và việc người cần làm                                                                                                                          |
| 5    | 👤      | Kéo integration branch, làm các bước 👤 của từng ticket con                                                                                                                              |
| 6    | 👤      | Push, bảo agent mở PR (`Closes` mọi ticket con; 🤖 tick dòng trong `tien-do.md`); người kia review, CI xanh → Squash and merge                                                           |

Cụm việc chưa có issue cha (ý tưởng mới, yêu cầu từ pilot): `/grilling` chốt chỗ chưa rõ → `/to-spec` → `/to-tickets` → rồi như trên.

**Luật khi chạy song song**

- Mỗi agent làm ticket chỉ chạy unit test của ticket đó. **E2E backend dùng chung một Postgres** nên chỉ chạy một lần trên integration branch ở cuối.
- **Không agent nào mở Metro hay điện thoại**; thử trên máy là bước 5 của người.
- **Schema DB**: ticket đổi schema xếp trước và chặn các ticket khác; hai ticket cùng đụng một bảng thì nối tiếp nhau, không song song (migration Drizzle sẽ conflict).
- Mỗi worktree cần chép `.env` và chạy `pnpm install` riêng.
- Ticket thêm thư viện native không chạy trong `/implement-spec` (phải build lại dev client).
- Frame: một agent khám phá chụp frame + trích spec một lần vào thư mục ghi chú ngoài repo; các agent làm ticket đọc từ đó, không cùng lúc điều khiển app Pen.

## 7. Thiết kế trong từng task

Ba nguồn: `DESIGN.md` (token, chữ, spacing, motion, mascot), `docs/design/screens/<khu>.md` (spec từng màn), `Des/nezfocus.pen` (frame tên `<mã màn> · <trạng thái>`, đọc qua MCP của pen.dev).

| Bước           | Thiết kế vào thế nào                                                                                                                                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tạo ticket     | Ghi REQ, mã màn hình, **danh sách trạng thái phải làm** (từ bảng trạng thái của spec, bỏ trạng thái v1.x), tên frame tương ứng                                                                                                                                                                                                    |
| Trước khi code | Đọc mục spec của từng màn: bố cục, component, bảng nội dung chữ, bảng trạng thái, tương tác, edge case. Chụp frame qua pen.dev                                                                                                                                                                                                    |
| Khi code       | Chỉ dùng token và component trong `shared/ui`, không gõ màu / kích thước tay. Chữ chép nguyên văn từ bảng nội dung vào file i18n. Dữ liệu giả = dữ liệu mẫu của spec để so được với frame                                                                                                                                         |
| Kiểm tra       | Chụp app ở từng trạng thái, đặt cạnh frame. Frame và board vẽ ở theme tối; bản sáng có đuôi `· light` ở một số trạng thái (dòng **Theme:** của ticket liệt kê bản sáng có thật); trạng thái không có bản sáng thì kiểm theme sáng bằng token. Đi hết "Checklist duyệt" của spec. Lệch thì sửa code, không sửa frame cho khớp code |

## 8. Khi tài liệu thiếu, sai hoặc mâu thuẫn

Bản gốc của SRS, `GLOSSARY.md`, `DESIGN.md`, spec màn hình và `Des/nezfocus.pen` nằm **trong repo này** (từ 05/11/2026). Sửa qua PR như code.

1. Agent **dừng và hỏi**, nêu số mục / REQ / mã màn hình. Không tự đoán rồi code.
2. Người chốt. Thứ tự sửa: **SRS** (nếu đổi hành vi: thêm CR trong `SRS_v1.2_change_notes.md`) → **spec** → **frame** → **code**.
3. Sửa tài liệu có thể đi chung PR với code của ticket, hoặc PR `docs` riêng nếu ảnh hưởng mảng kia (người kia phải biết).
4. **File `.pen` chỉ một người sửa** (file lớn, git không gộp được hai bản). Người kia cần đổi frame thì nhờ người đó; không sửa `.pen` trên hai branch cùng lúc.

## 9. Git

- **Agent được** commit và merge giữa các branch **trên máy mình** (branch ticket, integration branch); trên GitHub được gán issue, bình luận / tích AC, và mở PR khi người bảo. **Người** push và merge vào `main`. Agent không push, không merge vào `main`, không `reset --hard` / `rebase` branch đã push, không sửa lịch sử.
- **Commit không có dòng `Co-Authored-By`** (của bất kỳ agent nào).
- Conventional Commits, scope: `mobile backend shared mascot infra docs ci deps` (hook chặn sai), footer `Refs #<số>`.
- **Migration Drizzle**: trước khi merge PR có đổi schema, cập nhật branch từ `main`, xóa migration của branch mình, chạy lại `pnpm --filter backend db:generate`. Không sửa migration đã merge.
- **File chung hay conflict**: `app.module.ts`, `src/db/schema.ts`, `packages/shared/src/index.ts`, file điều hướng gốc của app. Chỉ thêm dòng, không sắp xếp lại; PR nhỏ, merge sớm.
- **Thư viện có native code** (LiveKit, FCM…): người thêm build lại dev client và báo người kia cài APK mới.
- Mỗi người chỉ sửa module backend và thư mục `features/` thuộc mảng mình (`task-breakdown.md` mục 2), trừ khi ticket ghi khác.
