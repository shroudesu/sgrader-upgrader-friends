# SGRADER UP demo

Статическая демо-игра с общей авторизацией, профилями игроков и виртуальным балансом на Supabase. Инструкция подключения базы находится в [`supabase/README.md`](supabase/README.md); SQL-схема — в [`supabase/schema.sql`](supabase/schema.sql).

Не загружайте в `supabase-config.js` ключ `service_role`. Нужен только публичный publishable/anon key, защищённый RLS-политиками из SQL-схемы.
