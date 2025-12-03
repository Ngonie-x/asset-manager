"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            if (!data.user) {
                setError("Login failed. Please try again.");
                setLoading(false);
                return;
            }

            // Login successful - let middleware handle the redirect
            // Just refresh the router to trigger middleware re-evaluation
            router.refresh();
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        setError(null);

        if (!email || !password) {
            setError("Please enter both email and password");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: email.split('@')[0], // Default name
                    },
                    emailRedirectTo: `${window.location.origin}/login`,
                }
            });

            if (error) {
                // Provide more helpful error messages
                if (error.message.includes("Anonymous sign-ins are disabled") ||
                    error.message.includes("signups are disabled")) {
                    setError("Email sign-ups are disabled. Please enable them in Supabase Auth settings (Authentication > Providers > Email).");
                } else if (error.message.includes("already registered")) {
                    setError("This email is already registered. Please sign in instead.");
                } else {
                    setError(error.message);
                }
            } else if (data.user) {
                // Check if email confirmation is required
                if (data.session) {
                    // User is immediately signed in (email confirmation disabled)
                    // Let middleware handle the redirect
                    router.refresh();
                } else {
                    // Email confirmation required
                    setError(null);
                    alert("Account created! Please check your email for the confirmation link.");
                }
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during sign up");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md dark:bg-zinc-800">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Asset Manager
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sign in to your account
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center">{error}</div>
                    )}

                    <div className="flex flex-col gap-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Loading..." : "Sign in"}
                        </Button>
                        <div className="text-center text-sm">
                            <span className="text-gray-500">Don't have an account? </span>
                            <button type="button" onClick={handleSignUp} className="text-blue-500 hover:underline">Sign up</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
