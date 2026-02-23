"use client";

import { authClient } from "@/lib/auth/client";
import { useState } from "react";

export default function AuthTestPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const { data: session, isPending, error } = authClient.useSession();

  const handleSignUp = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
    });
    setResult(error ? { error: error.message } : { success: "Signed up! Check console for verification email.", data });
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });
    setResult(error ? { error: error.message } : { success: "Signed in!", data });
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    setResult(null);
    const { error } = await authClient.signOut();
    setResult(error ? { error: error.message } : { success: "Signed out!" });
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setResult(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
    });
    setResult(error ? { error: error.message } : { success: "Redirecting to Google..." });
    setLoading(false);
  };

  const handleCreateOrg = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await authClient.organization.create({
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, "-"),
    });
    setResult(error ? { error: error.message } : { success: "Organization created!", data });
    setLoading(false);
  };

  const handleListOrgs = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await authClient.organization.list();
    setResult(error ? { error: error.message } : { organizations: data });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-2 text-2xl font-bold">Auth Test Page</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Temporary test page for BetterAuth integration. Delete the entire <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-800">app/test</code> folder when done.
          </p>
        </div>

        {/* Session Status */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Session Status</h2>
          {isPending ? (
            <p className="text-zinc-500">Loading session...</p>
          ) : session ? (
            <div className="space-y-2">
              <p className="text-green-600 dark:text-green-400">✓ Authenticated</p>
              <pre className="overflow-auto rounded bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                {JSON.stringify(session.user, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-zinc-500">Not authenticated</p>
          )}
          {error && (
            <p className="mt-2 text-red-500">Error: {error.message}</p>
          )}
        </div>

        {/* Auth Forms */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Authentication</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Name (for sign up)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="John Doe"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSignUp}
                disabled={loading || !email || !password}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Sign Up
              </button>
              <button
                onClick={handleSignIn}
                disabled={loading || !email || !password}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Sign In
              </button>
              <button
                onClick={handleSignOut}
                disabled={loading || !session}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Sign Out
              </button>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        </div>

        {/* Organization Tests */}
        {session && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold">Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="My Organization"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCreateOrg}
                  disabled={loading || !orgName}
                  className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Create Organization
                </button>
                <button
                  onClick={handleListOrgs}
                  disabled={loading}
                  className="rounded bg-zinc-600 px-4 py-2 text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  List Organizations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold">Result</h2>
            <pre className="overflow-auto rounded bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
