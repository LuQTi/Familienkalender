# Familienkalender

Ein gemeinsamer Online-Kalender: Die statische Webapp wird über GitHub Pages veröffentlicht. Termine liegen in Supabase und werden zwischen angemeldeten Familienmitgliedern synchronisiert.

## Einmalige Einrichtung

### 1. Supabase vorbereiten

1. Ein Supabase-Projekt erstellen und `supabase/schema.sql` im SQL Editor ausführen.
2. Unter **Authentication → URL Configuration** die GitHub-Pages-Adresse als Site URL eintragen, zum Beispiel `https://BENUTZER.github.io/REPOSITORY/`.
3. Unter **Authentication → Providers → Email** E-Mail/Passwort aktiv lassen. Für einfachere Einrichtung kann E-Mail-Bestätigung zunächst ausgeschaltet werden.
4. Unter **Project Settings → API** Project URL und anon/publishable key kopieren. Niemals den `service_role`-Key verwenden.

### 2. Erstes Familienkonto und Familie anlegen

Die App bietet eine Registrierung. Sobald das erste Konto erstellt und gegebenenfalls bestätigt wurde, im Supabase SQL Editor diesen Bootstrap ausführen. E-Mail und Familienname anpassen:

```sql
with new_family as (
  insert into public.families (name) values ('Familie Müller') returning id
)
insert into public.family_members (family_id, user_id, display_name)
select new_family.id, auth.users.id, 'Familienadmin'
from new_family, auth.users
where auth.users.email = 'deine-email@example.com';
```

Für jedes weitere Familienmitglied: in der App registrieren, danach dieses SQL im Supabase SQL Editor ausführen (E-Mail und Anzeigename anpassen):

```sql
insert into public.family_members (family_id, user_id, display_name)
select (select family_id from public.family_members limit 1), id, 'Mama'
from auth.users where email = 'mitglied@example.com';
```

Die Row Level Security Policies schränken jeden Datenbankzugriff auf die Familie ein, der das angemeldete Konto zugeordnet wurde.

### 3. GitHub Pages einschalten

1. Diesen Projektordner in ein GitHub-Repository laden und den Branch `main` verwenden.
2. In **Repository Settings → Secrets and variables → Actions** zwei Repository Secrets anlegen: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
3. Unter **Settings → Pages → Build and deployment** als Source **GitHub Actions** wählen.
4. Bei Push auf `main` baut `.github/workflows/deploy.yml` die Seite und veröffentlicht sie auf GitHub Pages.
5. Die fertige Pages-Adresse in Supabase unter **Authentication → URL Configuration** als Redirect URL erlauben.

## Lokal entwickeln

```sh
npm install
```

`.env.example` nach `.env` kopieren, Supabase URL und anon key eintragen, dann `npm run dev` starten. Ohne Zugangsdaten ist nur eine lokale Demo mit Beispieldaten verfügbar; die veröffentlichte Familienseite benötigt Supabase-Zugangsdaten und Familienkonten.
