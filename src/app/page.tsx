"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is logged in and redirect accordingly
        // Middleware will handle the actual redirect, but this ensures immediate client-side redirect
        const supabase = createClient();
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (profile?.role === "admin") {
                    router.push("/admin");
                } else {
                    router.push("/dashboard");
                }
            } else {
                router.push("/login");
            }
        };

        checkUser();
    }, [router]);

    // Show loading state while checking
    return (
        <main className="flex min-h-screen flex-col items-center justify-center">
            <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
        </main>
    );
}
