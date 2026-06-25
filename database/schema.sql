-- =====================================================================
-- سامانه گزارش روزانه و تعمیر و نگهداشت معدن انگوران چای - کی‌کاو آلتین
-- ساختار پایگاه داده (PostgreSQL / Supabase)
-- =====================================================================
-- این فایل تمام جدول‌های لازم برای سه بخش سایت را می‌سازد:
--   ۱) کاربران و دسترسی‌ها
--   ۲) گزارش روزانه معدن
--   ۳) تعمیر و نگهداشت تجهیزات
-- =====================================================================

-- ---------------------------------------------------------------------
-- بخش ۱: کاربران و نقش‌ها
-- ---------------------------------------------------------------------

-- نقش‌های ممکن: admin (مدیر/داشبورد کامل), supervisor (سرپرست), operator (اپراتور/اتاق کنترل)
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    username text unique not null,
    password_hash text not null,
    full_name text not null,
    role text not null check (role in ('admin', 'supervisor', 'operator')),
    position_title text, -- مثلاً «سرپرست کارخانه فرآوری» یا «مسئول اتاق کنترل»
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

comment on table users is 'کاربران سامانه با نقش‌های مدیر، سرپرست، اپراتور';

-- ---------------------------------------------------------------------
-- بخش ۲: گزارش روزانه معدن
-- ---------------------------------------------------------------------

-- جدول اصلی گزارش روزانه - یک ردیف به ازای هر روز
create table if not exists daily_reports (
    id uuid primary key default gen_random_uuid(),
    report_date date not null unique, -- تاریخ میلادی داخلی (برای محاسبه و مرتب‌سازی)
    report_date_shamsi text not null, -- نمایش تاریخ شمسی مثل ۱۴۰۵/۰۴/۰۲
    submitted_by uuid references users(id),
    submitted_at timestamptz not null default now(),
    last_edited_by uuid references users(id),
    last_edited_at timestamptz,

    -- وضعیت کلی روز
    is_mine_active boolean not null, -- آیا معدن امروز فعال بوده
    inactivity_reason text check (
        inactivity_reason is null or inactivity_reason in (
            'تعطیلی رسمی/برنامه‌ریزی‌شده',
            'خرابی دستگاه/تجهیزات',
            'معارض محلی',
            'شرایط جوی نامناسب',
            'کمبود سوخت',
            'کمبود آب',
            'کمبود برق'
        )
    ),
    inactivity_note text, -- توضیح تکمیلی اختیاری

    -- اطلاعات کلی
    weather_condition text, -- آفتابی/ابری/بارانی/...
    temperature numeric,

    is_complete boolean not null default false, -- آیا همه بخش‌های اجباری پر شده‌اند

    -- تأیید نهایی سرپرست (معادل «امضاء سرپرست معدن» در فرم کاغذی)
    approved_by uuid references users(id),
    approved_at timestamptz,

    created_at timestamptz not null default now()
);

comment on table daily_reports is 'گزارش روزانه معدن - یک ردیف به ازای هر روز، شامل وضعیت تعطیلی در صورت وجود';

-- عملکرد خط تولید به تفکیک شیفت
create table if not exists production_shifts (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    shift_number int not null check (shift_number in (1, 2)), -- شیفت اول یا دوم
    start_time time,
    end_time time,
    run_count int, -- تعداد ران
    nelson1_run_count int,
    nelson2_run_count int,
    nelson_water_pressure numeric, -- فشار آب نلسون
    input_tonnage numeric, -- بار ورودی به خط (تن)
    nelson1_concentrate numeric, -- کنسانتره نلسون ۱
    nelson2_concentrate numeric, -- کنسانتره نلسون ۲
    unique(daily_report_id, shift_number)
);

comment on table production_shifts is 'عملکرد خط تولید به تفکیک شیفت اول و دوم برای هر روز';

-- استخراج و دپو
create table if not exists extraction_records (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    has_extraction boolean not null default true, -- موردی وجود نداشت = false
    extraction_location text,
    extraction_tonnage numeric,
    dump_location text,
    dump_cumulative_tonnage numeric
);

-- فروش ماسه/سنگ/گراول - چند ردیف ممکن در هر روز (هر ردیف یک خریدار)
create table if not exists sales_records (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    has_sales boolean not null default true, -- اگر false یعنی «بدون فروش امروز»، بقیه فیلدها نال
    material_type text, -- ماسه / سنگ / گراول
    buyer_name text, -- نام خریدار
    total_purchased_tonnage numeric, -- مقدار تناژ کل خریداری‌شده (طبق توافق اولیه خریدار)
    daily_exit_tonnage numeric, -- تناژ خارج‌شده در روز
    cumulative_exit_tonnage numeric, -- تناژ کل خارج‌شده تا کنون
    note text -- توضیحات
);

-- عملیات انجام‌شده روزانه (لیست آزاد، چند ردیف)
create table if not exists daily_operations (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    has_operations boolean not null default true, -- false = «عملیات خاصی غیر از روتین انجام نشد»
    description text
);

-- نیروی انسانی روزانه
create table if not exists daily_personnel (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    personnel_name text not null,
    position_title text,
    is_present boolean not null default false, -- ستون «حاضر» در فرم واقعی
    is_on_leave boolean not null default false, -- ستون «مرخصی» در فرم واقعی
    note text
);

-- ماشین‌آلات روزانه (وضعیت کلی هر دسته ماشین)
create table if not exists daily_machinery (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    machine_type text not null, -- لودر/بیل/کامیون/دیزل/...
    total_count int not null default 0,
    active_count int not null default 0,
    inactive_count int not null default 0,
    under_repair_count int not null default 0,
    note text
);

-- مشکلات و موانع روزانه
create table if not exists daily_issues (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    has_issues boolean not null default true, -- false = «موردی وجود نداشت»
    description text
);

-- دلایل تأخیر هر ران (به تفکیک شیفت)
create table if not exists run_delays (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    has_delay boolean not null default true, -- false = «موردی وجود نداشت»
    shift_number int check (shift_number in (1, 2)),
    delay_reason text,
    delay_duration_minutes numeric
);

-- گزارش خرابی قطعه (در سطح گزارش روزانه کلی - سطح خلاصه، نه فنی عمیق)
create table if not exists daily_breakdown_reports (
    id uuid primary key default gen_random_uuid(),
    daily_report_id uuid not null references daily_reports(id) on delete cascade,
    has_breakdown boolean not null default true, -- false = «موردی وجود نداشت»
    part_name text,
    part_specifications text, -- مشخصات قطعه (طبق ستون واقعی فرم)
    related_equipment text,
    cause text,
    corrective_action text,
    delay_minutes numeric,
    photo_url text -- آپلود عکس اختیاری
);

comment on table daily_breakdown_reports is 'گزارش خرابی قطعه در سطح گزارش روزانه - فیلد عکس اختیاری دارد';

-- ---------------------------------------------------------------------
-- بخش ۳: تعمیر و نگهداشت تجهیزات (نت)
-- ---------------------------------------------------------------------

-- شناسنامه تجهیزات (معادل دیجیتال فرم MIN-FR-06)
create table if not exists equipment (
    id uuid primary key default gen_random_uuid(),
    code text unique not null, -- کد تجهیز مطابق سند واقعی (مثلاً '1' برای هاپر)
    name text not null, -- مثلاً «هاپر»، «نوار نقاله مادر»، «نلسون»
    inspection_frequency_days int not null default 1, -- ۱ = روزانه، ۷ = هفتگی
    is_active boolean not null default true
);

comment on table equipment is 'شناسنامه تجهیزات خط فرآوری - معادل فرم MIN-FR-06، بر اساس ۱۲ تجهیز اصلی خط';

-- چک‌لیست بازرسی هر تجهیز (تعریف سؤالات - معادل فرم MIN-FR-03)
-- بر اساس داده واقعی «برنامه روزانه تعمیرات نگهداشت خط تولید»
create table if not exists inspection_checklist_items (
    id uuid primary key default gen_random_uuid(),
    equipment_id uuid not null references equipment(id) on delete cascade,
    code text not null, -- کد دقیق آیتم مطابق سند (مثلاً '1-1-1')
    category text, -- دسته میانی در صورت وجود (مثلاً «موتور ویبره»)
    item_order int not null,
    item_text text not null, -- متن کوتاه سؤال که در فرم اصلی نشان داده می‌شود
    inspection_method text, -- روش بازرسی کوتاه (مثلاً «با آمپرسنج»)
    field_type text not null default 'visual' check (
        field_type in ('visual', 'temperature', 'amperage', 'voltage', 'vibration', 'tactile', 'manual_check')
    ),
    unit text, -- واحد اندازه‌گیری در صورت عددی بودن (سانتی‌گراد / آمپر / ولت)
    threshold_text text, -- حد مجاز به‌صورت متن (مثلاً «کمتر از دمای محیط + ۴۰ درجه»)
    detail_text text, -- توضیح تفصیلی کامل برای نمایش در صفحه راهنما
    is_active boolean not null default true
);

comment on table inspection_checklist_items is 'سؤالات چک‌لیست هر تجهیز - فیلد field_type نوع ورودی فرم را تعیین می‌کند (چشمی/عددی)';

-- ثبت بازرسی واقعی (هر بار که اپراتور چک‌لیست را پر می‌کند)
create table if not exists inspection_records (
    id uuid primary key default gen_random_uuid(),
    equipment_id uuid not null references equipment(id),
    inspected_by uuid references users(id),
    inspection_date date not null,
    inspection_date_shamsi text not null,
    submitted_at timestamptz not null default now(),
    is_complete boolean not null default false
);

-- نتیجه هر سؤال چک‌لیست در یک بازرسی خاص
create table if not exists inspection_results (
    id uuid primary key default gen_random_uuid(),
    inspection_record_id uuid not null references inspection_records(id) on delete cascade,
    checklist_item_id uuid not null references inspection_checklist_items(id),
    status text not null check (status in ('سالم', 'خراب')),
    numeric_value numeric, -- مقدار عددی ثبت‌شده (دما/آمپر/ولتاژ) در صورت وجود
    note text,
    photo_url text -- عکس اختیاری برای موارد خراب
);

-- ثبت خرابی و تعمیرات (معادل دیجیتال فرم MIN-FR-05 + دکمه «ثبت خرابی فوری»)
create table if not exists breakdown_records (
    id uuid primary key default gen_random_uuid(),
    equipment_id uuid references equipment(id),
    equipment_name_free_text text, -- در صورتی که تجهیز در لیست شناسنامه نباشد
    reported_by uuid references users(id),
    breakdown_type text check (breakdown_type in ('اتفاقی', 'پیشگیرانه', 'پیش‌بینانه')),

    failure_datetime timestamptz not null, -- لحظه شروع خرابی
    resolved_datetime timestamptz, -- لحظه رفع خرابی (برای محاسبه MTTR)

    cause text,
    corrective_action text,
    spare_parts_used text,
    photo_url text, -- عکس اختیاری

    status text not null default 'باز' check (status in ('باز', 'در حال تعمیر', 'رفع‌شده')),

    created_at timestamptz not null default now()
);

comment on table breakdown_records is 'ثبت خرابی و تعمیرات - معادل فرم MIN-FR-05، پایه محاسبه MTTR و MTBF';

-- برنامه PM سالیانه هر تجهیز (معادل فرم MIN-FR-02)
create table if not exists pm_schedule (
    id uuid primary key default gen_random_uuid(),
    equipment_id uuid not null references equipment(id),
    last_inspection_date date,
    next_due_date date
);

comment on table pm_schedule is 'وضعیت (سالم/نزدیک/معوق) در کد سمت کلاینت از روی next_due_date محاسبه می‌شود، نه در پایگاه داده';

-- ---------------------------------------------------------------------
-- ایندکس‌های پراستفاده برای سرعت گزارش‌گیری
-- ---------------------------------------------------------------------

create index if not exists idx_daily_reports_date on daily_reports(report_date);
create index if not exists idx_production_shifts_report on production_shifts(daily_report_id);
create index if not exists idx_breakdown_equipment on breakdown_records(equipment_id);
create index if not exists idx_breakdown_failure_date on breakdown_records(failure_datetime);
create index if not exists idx_inspection_equipment on inspection_records(equipment_id);
create index if not exists idx_inspection_date on inspection_records(inspection_date);

-- =====================================================================
-- پایان ساختار پایگاه داده
-- =====================================================================
