"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@blak/ui/components/button"
import { Input } from "@blak/ui/components/input"
import { Label } from "@blak/ui/components/label"

export function AdminLoginForm({
  title,
  redirectTo,
}: {
  title: string
  redirectTo: string
}) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push(redirectTo)
    } catch {
      setError("Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4">
      <Image src="/logo/logo.png" width={140} height={38} alt="BLAK" />
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
      >
        <h2 className="mb-6 text-center text-lg font-semibold tracking-wide uppercase">
          {title}
        </h2>

        <div className="mb-4 flex flex-col gap-1.5">
          <Label htmlFor="email">Email ID</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@blak.com"
            required
          />
        </div>

        <div className="mb-4 flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" className="size-3.5" /> Remember me
          </label>
          <span className="cursor-pointer hover:text-foreground">
            Forgot Password?
          </span>
        </div>

        {error && (
          <p className="mb-4 text-xs font-medium text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Login →
        </Button>
      </form>
    </div>
  )
}
