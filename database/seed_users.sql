-- دستورات SQL ساخت کاربران اولیه
-- این رمزها موقت هستند - حتماً بعد از اولین ورود تغییر داده شوند

insert into users (username, password_hash, full_name, role, position_title) values ('ali.modir', '$2b$12$dW.MsmlDlZK3TWLMIGIlr.XuZ0BDZGaCf5uqGIFBspWRW34A5t.cO', 'علی', 'admin', 'مدیریت');
insert into users (username, password_hash, full_name, role, position_title) values ('behnam.gh', '$2b$12$ikGjmvqbD60U17oWinPenO6XLMKZo/w1E/xBvzxdjbboVKF616yZO', 'بهنام قراقلی', 'operator', 'مسئول اتاق کنترل');
insert into users (username, password_hash, full_name, role, position_title) values ('reza.k', '$2b$12$xNVxs.IErPviHmCFCGle5.blNWizMmrxLitCfSQe.SlEC0zG.a14y', 'رضا کشاورز', 'supervisor', 'سرپرست کارخانه فرآوری');
insert into users (username, password_hash, full_name, role, position_title) values ('meysam.k', '$2b$12$qqOCGmQH5abYUVBcCGnYNu8MX4HtQihf5wBNhIjBu2MG2wJpxoUUe', 'میثم کشاورز', 'operator', 'مسئول اتاق کنترل');
