# Issue tracker: GitHub

Ticket và spec của repo này là GitHub Issues của `Hagno1310/NezFocus`. Mọi thao tác dùng `gh` CLI (tự nhận repo từ `git remote` khi chạy trong repo).

## Lệnh

- **Tạo issue**: `gh issue create --title "..." --body "..." --label "..."`. Body nhiều dòng dùng heredoc.
- **Đọc issue**: `gh issue view <số> --comments` (kèm nhãn).
- **Liệt kê**: `gh issue list --state open --json number,title,body,labels,assignees --jq '[.[] | {number, title, labels: [.labels[].name], assignees: [.assignees[].login]}]'`, lọc thêm bằng `--label`.
- **Bình luận**: `gh issue comment <số> --body "..."`
- **Gắn / gỡ nhãn**: `gh issue edit <số> --add-label "..."` / `--remove-label "..."`
- **Nhận việc**: `gh issue edit <số> --add-assignee @me`
- **Đóng**: `gh issue close <số> --comment "..."`. Bình thường issue tự đóng khi PR có `Closes #<số>` được merge vào `main`.

## Quan hệ chặn nhau

Dùng **issue dependencies** của GitHub (hiện trong giao diện): `gh api --method POST repos/Hagno1310/NezFocus/issues/<số>/dependencies/blocked_by -F issue_id=<db-id của issue chặn>`. `db-id` lấy bằng `gh api repos/Hagno1310/NezFocus/issues/<số> --jq .id` (không phải `#số`). Nếu API không dùng được, ghi dòng `Blocked by: #<số>, #<số>` ở đầu body.

Một ticket **sẵn sàng** khi mọi issue chặn nó đã đóng và chưa ai nhận.

## Quy ước của dự án

- **Nhãn mảng**: `mang-a`, `mang-b` (xem `docs/task-breakdown.md` mục 2). **Nhãn giai đoạn**: `p0` … `p4`. **Nhãn khác**: `hop-dong` (ticket chỉ chứa hợp đồng trong `packages/shared`), `de-xuat-hoan`, `spec` (issue chứa spec do `/to-spec` tạo).
- **Body ticket** có đủ: REQ-ID; mã màn hình + danh sách trạng thái phải làm + tên frame trong `Des/nezfocus.pen`; Acceptance Criteria dạng checkbox (chép từ SRS, kể cả case âm); chỗ chạm với mảng kia và cách gỡ chờ (Fake / bản tạm). Mọi việc hoãn trong body ("Ngoài phạm vi", "Chưa làm ở ticket này", placeholder) ghi đích là `P?-? (#số)` của một ticket **có ghi việc đó**, hoặc v1.x / Backlog kèm REQ / CR; không ghi chỉ giai đoạn ("P3", "ticket sau"). Luật đầy đủ: `docs/WORKFLOW.md` mục 5 › Việc hoãn phải có chủ.
- **Branch**: `<loại>/<số issue>-<mo-ta-ngan>`, ví dụ `feat/12-dang-ky-tai-khoan`. Integration branch của `/implement-spec`: `feat/<số issue spec>-<mo-ta>`.
- **Commit**: Conventional Commits, footer `Refs #<số>`. **PR**: body có `Closes #<số>` cho từng ticket.

## Khi skill nói "publish to the issue tracker"

Tạo một GitHub issue theo quy ước trên.

## Khi skill nói "fetch the relevant ticket"

Chạy `gh issue view <số> --comments`.

## Pull request như kênh yêu cầu

**PRs as a request surface: no.**
