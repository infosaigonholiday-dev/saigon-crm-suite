# Sort lại danh sách B2B Tours theo trạng thái hết hạn

## Bối cảnh
Hiện `enrichedTours` trong `src/pages/B2BTours.tsx` đang sort ASC theo `departure_date` cho TẤT CẢ tour (nulls last). Khi filter "Tất cả" hoặc "Đã hết hạn", các tour quá khứ rất xa lại nằm lẫn lên đầu → Sale phải kéo qua mới thấy tour sắp khởi hành.

## Yêu cầu sort mới
- Tour **còn hạn** (`!_expired`): ASC theo `departure_date` — gần khởi hành lên đầu.
- Tour **hết hạn** (`_expired`): DESC theo `departure_date` — mới hết hạn lên trước.
- Filter **"Tất cả"**: nhóm còn hạn lên trước (ASC), rồi đến nhóm hết hạn (DESC).
- Tour không parse được `departure_date` (null): luôn xuống cuối nhóm của nó.

## Thay đổi (chỉ 1 file: `src/pages/B2BTours.tsx`)

### 1. Bỏ sort tổng trong `enrichedTours`
Trong `useMemo` của `enrichedTours`: bỏ `.sort(...)` hiện tại, chỉ giữ phần `.map(...)` để gắn `_dep / _departed / _visaExpired / _expired`. Sort sẽ làm ở `filteredTours` để áp đúng theo từng filter mode.

### 2. Sort trong `filteredTours`
Viết 2 helper local:

```ts
const cmpAsc = (a, b) => {
  if (!a._dep && !b._dep) return 0;
  if (!a._dep) return 1;       // null xuống cuối
  if (!b._dep) return -1;
  return a._dep.getTime() - b._dep.getTime();
};
const cmpDesc = (a, b) => {
  if (!a._dep && !b._dep) return 0;
  if (!a._dep) return 1;       // null vẫn xuống cuối
  if (!b._dep) return -1;
  return b._dep.getTime() - a._dep.getTime();
};
```

Logic mới của `filteredTours`:
- `expiryFilter === "active"`: `enrichedTours.filter(!_expired).sort(cmpAsc)`
- `expiryFilter === "expired"`: `enrichedTours.filter(_expired).sort(cmpDesc)`
- `expiryFilter === "all"`: 
  - `active = enriched.filter(!_expired).sort(cmpAsc)`
  - `expired = enriched.filter(_expired).sort(cmpDesc)`
  - return `[...active, ...expired]`

Pagination client-side đã có sẵn — slice trên kết quả mới này, không cần đổi gì.

## Test
- TC1 "Còn hạn": tour gần nhất (ví dụ 12/05/2026) lên đầu, xa nhất xuống cuối.
- TC2 "Đã hết hạn": tour mới hết hạn (ví dụ 30/04/2026) lên đầu, tour 01/2026 xuống cuối.
- TC3 "Tất cả": nửa trên là tour còn hạn ASC, nửa dưới là tour hết hạn DESC, ranh giới rõ ràng tại `today`.
- TC4: tour không có `departure_date` luôn ở cuối nhóm tương ứng.
- TC5: Pagination + reload + filter market/dest/month vẫn hoạt động.

## Không làm
- Không đụng schema, không đụng các filter khác, không đụng badge/booking guard đã làm trước đó.
