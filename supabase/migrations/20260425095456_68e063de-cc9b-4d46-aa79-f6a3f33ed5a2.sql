-- 1. Cập nhật policy duyệt đơn: ADMIN bypass quy tắc không-tự-duyệt
DROP POLICY IF EXISTS "leave_requests_update_approval" ON public.leave_requests;

CREATE POLICY "leave_requests_update_approval"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (
  -- ADMIN/SUPER_ADMIN: duyệt được TẤT CẢ, không bị giới hạn
  public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
  OR (
    -- Các vai trò khác: KHÔNG được duyệt đơn của chính mình
    employee_id != COALESCE(public.get_my_employee_id(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- HR_MANAGER duyệt được mọi đơn (trừ đơn của chính mình)
      public.has_role(auth.uid(), 'HR_MANAGER')
      OR
      -- Manager/GDKD chỉ duyệt nhân viên thường cùng phòng (không duyệt cấp ngang/trên)
      (
        public.has_any_role(auth.uid(), ARRAY['MANAGER','GDKD'])
        AND EXISTS (
          SELECT 1 FROM public.employees e
          LEFT JOIN public.profiles p ON p.id = e.profile_id
          WHERE e.id = leave_requests.employee_id
            AND e.department_id = public.get_my_department_id()
            AND COALESCE(p.role, '') NOT IN ('MANAGER','GDKD','HR_MANAGER','ADMIN','SUPER_ADMIN','DIEUHAN','HCNS')
            AND COALESCE(e.position, '') NOT IN ('GIAM_DOC','PHO_GIAM_DOC','TRUONG_PHONG','PHO_PHONG')
        )
      )
    )
  )
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN'])
  OR (
    employee_id != COALESCE(public.get_my_employee_id(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      public.has_role(auth.uid(), 'HR_MANAGER')
      OR (
        public.has_any_role(auth.uid(), ARRAY['MANAGER','GDKD'])
        AND EXISTS (
          SELECT 1 FROM public.employees e
          LEFT JOIN public.profiles p ON p.id = e.profile_id
          WHERE e.id = leave_requests.employee_id
            AND e.department_id = public.get_my_department_id()
            AND COALESCE(p.role, '') NOT IN ('MANAGER','GDKD','HR_MANAGER','ADMIN','SUPER_ADMIN','DIEUHAN','HCNS')
            AND COALESCE(e.position, '') NOT IN ('GIAM_DOC','PHO_GIAM_DOC','TRUONG_PHONG','PHO_PHONG')
        )
      )
    )
  )
);

-- 2. Đảm bảo HR_MANAGER + HCNS xem được toàn bộ đơn để chấm công
DROP POLICY IF EXISTS "leave_requests_read_hr_all" ON public.leave_requests;

CREATE POLICY "leave_requests_read_hr_all"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPER_ADMIN','HR_MANAGER','HCNS'])
);
