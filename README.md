# Asset Manager

A modern web application for managing organizational assets built with Next.js and Supabase.

## Features

### Authentication
- Email/Password login
- Role-based access (Admin/User)
- Automatic user profile creation

### Admin Features
- Create and manage users
- Create asset categories
- Create departments
- View and delete all assets
- Full system oversight

### User Features
- Create new assets
- View only assets they created
- Track asset details (Name, Category, Department, Cost, Date Purchased)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel + Supabase

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd asset-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key
4. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase_schema.sql` (in the artifacts folder)
4. Paste and run the SQL script

This will create:
- Tables: `departments`, `categories`, `profiles`, `assets`
- Row Level Security policies
- Initial seed data

### 5. Create Admin User

After running the migration, sign up through the app. Then manually update your user's role in Supabase:

1. Go to Table Editor > profiles
2. Find your user
3. Change `role` from `user` to `admin`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Project Structure

```
asset-manager/
├── src/
│   ├── app/
│   │   ├── admin/          # Admin dashboard
│   │   ├── dashboard/      # User dashboard
│   │   ├── login/          # Login page
│   │   └── page.tsx        # Home page
│   ├── components/
│   │   └── ui/             # Reusable UI components
│   ├── lib/
│   │   ├── supabase/       # Supabase client config
│   │   └── utils.ts        # Utility functions
│   └── middleware.ts       # Route protection
├── .env.example            # Environment variables template
└── package.json
```

## Database Schema

### Tables

- **departments**: Organization departments
- **categories**: Asset categories
- **profiles**: User profiles with roles
- **assets**: Asset records with full details

### Security

Row Level Security (RLS) is enabled on all tables:
- Admins have full access to all data
- Users can only view/create their own assets
- Everyone can read categories and departments

## License

MIT
