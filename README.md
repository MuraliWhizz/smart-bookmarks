# Smart Bookmarks App

A simple bookmark manager built with **Next.js (App Router)**, **Supabase**, and **Tailwind CSS**.

Users can:
- Login with Google (OAuth)
- Add bookmarks
- Delete bookmarks
- View their own private bookmarks
- See real-time updates

---

##  Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + Realtime)

---

## Setup Instructions

### Clone the Project

```bash
git clone <your-repo-url>
cd smart-bookmarks
npm install


NEXT_PUBLIC_SUPABASE_URL=https://pztefqhzwiisptvhmocg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ljmZcHWpFj0qssoNyiV31Q_5NQUS9nW



Setup Supabase
Create Table
```

# Run this in Supabase SQL Editor:

```
create table bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  created_at timestamp with time zone default now()
);

```

# Enable Row Level Security

```
alter table bookmarks enable row level security;

Create policies:

create policy "Users can view own bookmarks"
on bookmarks
for select
using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
on bookmarks
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
on bookmarks
for delete
using (auth.uid() = user_id);

Setup Google OAuth

Go to Google Cloud Console

Create OAuth 2.0 Credentials (Web Application)

Add Redirect URI:


Features

Google OAuth authentication

Private bookmarks per user (secured with RLS)

Add and delete bookmarks

Real-time synchronization across tabs

Clean UI with Tailwind

```


# Problems Faced & Solutions

Google OAuth Error

Error:

Unsupported provider: provider is not enabled


Cause:
Google provider was not enabled in Supabase.

Solution:
Enabled Google under:
Authentication → Providers → Google
Added correct redirect URI.

403 Forbidden When Adding Bookmarks

Error:

POST /rest/v1/bookmarks 403 (Forbidden)


Cause:
Row Level Security (RLS) policies were missing or incorrect.

Solution:
Created proper policies:

using (auth.uid() = user_id)
with check (auth.uid() = user_id)


# Ensured RLS was enabled.

Bookmarks Not Updating Without Page Reload

Cause:
Realtime was not enabled or subscription was not properly configured.

Solution:

Enabled Replication for bookmarks table.

Added realtime subscription with user filter:

filter: `user_id=eq.${user.id}`


Also updated local state after insert/delete for instant UI update.

# Silent Insert Failures

Cause:
Errors were not being logged.

Solution:
Added:

const { data, error } = await supabase.from(...).insert(...).select()
console.log(error)


This helped debug RLS issues.

# Future Improvements

Edit bookmark feature

Search/filter bookmarks

Form validation

Deployment to Vercel

```
