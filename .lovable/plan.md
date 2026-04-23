

## Fix cột ghi chú không hiển thị trong Kho Data

### Vấn đề
Trang `src/pages/RawContacts.tsx` đã có sẵn:
- Import `MessageSquare`, `NotesCountBadge`, `InternalNotesDialog`
- State `notesOpenId` + render `<InternalNotesDialog/>` ở cuối page

Nhưng **thiếu nút trigger** trong cột "Thao tác" của bảng → user không có cách nào mở dialog.

Ngoài ra RLS policy `notes_read` hiện chỉ cho người tạo / người được tag / 3 role cao đọc → đồng nghiệp cùng phòng không thấy ghi chú của nhau dù có quyền view record.

### Sẽ sửa

**1. `src/pages/RawContacts.tsx`** — thêm nút 💬 vào cột Thao tác (cả nhánh `isConverted` và nhánh chưa convert), đặt trước nút Xóa:
```tsx
<Button
  size="sm" variant="ghost" className="h-7 px-2 gap-1"
  onClick={() => setNotesOpenId(c.id)}
  title="Ghi chú nội bộ"
>
  <MessageSquare className="h-3.5 w-3.5" />
  <NotesCountBadge entityType="raw_contact" entityId={c.id} />
</Button>
```

**2. Migration mở rộng RLS `internal_notes.notes_read`** — cho mọi user active đọc được, vì:
- Bảng record gốc đã RLS lọc rồi (user không thấy raw_contact thì cũng không biết notes nào để hỏi)
- Mục đích "ghi chú nội bộ" là chia sẻ trong team

```sql
DROP POLICY IF EXISTS notes_read ON public.internal_notes;
CREATE POLICY notes_read ON public.internal_notes
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.uid() = ANY (mention_user_ids)
    OR get_profile_is_active(auth.uid()) = true
  );
```

### Test
1. Sales A vào Kho Data → click 💬 trên 1 row → viết ghi chú + tag B → Gửi
2. Sales B reload → row đó có badge `(1)` cạnh icon 💬 → click thấy nội dung
3. Sales C cùng phòng (không bị tag) cũng thấy ghi chú đó

