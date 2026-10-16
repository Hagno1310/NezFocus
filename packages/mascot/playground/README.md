# Mascot playground

Trang HTML đơn giản để bấm thử các hành động (mood) của mascot Runtime.

## Chạy

Trình duyệt không cho đọc file `.riv` qua `file://`, nên cần một server tĩnh nhỏ chạy ở `packages/mascot` (để trang thấy được `dist/runtime.riv` và `speech/`):

```bash
cd packages/mascot
python -m http.server 8080
```

Rồi mở: <http://localhost:8080/playground/>

- Nút **1–7** (hoặc phím 1–7): đổi `mood`.
- **Dừng/Chạy** (phím Space), **Nạp lại file** (sau khi xuất lại `runtime.riv` bằng `rive . --once` + copy vào `dist/`).
- Đổi kích cỡ (120 / 240 / 400px) và nền sáng/tối.

Runtime web lấy từ CDN (`@rive-app/canvas@2`), nên cần có mạng lần đầu.

## Trò chuyện (khung thoại)

- Nhóm nút **Trò chuyện**: mỗi nút nói một câu ngẫu nhiên trong nhóm (lấy từ `speech/lines.vi.json`), đổi mood theo câu, vẫy tay nếu câu có `gesture: "wave"`.
- **Tự tám chuyện (7s)**: tự nói một câu hỏi thăm / cổ vũ / tám chuyện mỗi 7 giây. Phím **T**: nói một câu.
- Đang ngủ thì không nói. Click vào nhân vật để đánh thức → nó nói một câu "bị đánh thức".
- Khung thoại do trang HTML vẽ (không nằm trong `.riv`) — đúng cách app React Native nên làm.
