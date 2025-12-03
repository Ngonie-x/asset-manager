import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // If no user and trying to access protected routes
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
        // Allow access to public assets or api if needed, but for now redirect everything else to login
        // except maybe static files
        if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.startsWith('/static')) {
            return response
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Helper function to get or create profile
    const getOrCreateProfile = async (userId: string) => {
        let { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        // If profile doesn't exist, create it
        if (error || !profile) {
            const fullName = user.user_metadata?.full_name || 
                           user.email?.split('@')[0] || 
                           'User'
            
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    full_name: fullName,
                    role: 'user'
                })
                .select('role')
                .single()

            if (!createError && newProfile) {
                return newProfile
            }
            // If creation fails, return default user role
            return { role: 'user' }
        }

        return profile
    }

    // If user is logged in
    if (user) {
        // Redirect from login page to appropriate dashboard based on role
        if (request.nextUrl.pathname.startsWith('/login')) {
            const profile = await getOrCreateProfile(user.id)
            
            if (profile?.role === 'admin') {
                return NextResponse.redirect(new URL('/admin', request.url))
            } else {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }

        // Redirect from home page to appropriate dashboard
        if (request.nextUrl.pathname === '/') {
            const profile = await getOrCreateProfile(user.id)
            
            if (profile?.role === 'admin') {
                return NextResponse.redirect(new URL('/admin', request.url))
            } else {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }

        // Protect admin routes - redirect non-admins to dashboard
        if (request.nextUrl.pathname.startsWith('/admin')) {
            const profile = await getOrCreateProfile(user.id)
            
            if (profile?.role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
