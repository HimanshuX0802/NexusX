"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"
import { Loader2, AlertCircle } from "lucide-react"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login, register } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }
    setLoading(true)
    setError("")
    try {
      await login(email, password)
    } catch (error: any) {
      setError(error.message || "Failed to login")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !displayName) {
      setError("Please fill in all fields")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    setError("")
    try {
      await register(email, password, displayName)
    } catch (error: any) {
      setError(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setEmail("")
    setPassword("")
    setDisplayName("")
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-[#2C2F48] to-[#1E2235]">
      {/* Header with Reddit Logo and Log In Button */}
      <header className="absolute top-0 left-0 right-0 flex justify-between items-center p-4">
        <img
          src="https://preview.redd.it/g6003su6ug9e1.png?auto=webp&s=e13cb3bd1fda95d043e11869b802d17bc4148d9b"
          alt=" Logo"
          className="h-8 sm:h-10"
        />
        <Button
          className="bg-[#5865F2] text-white rounded-full px-4 py-2 hover:bg-[#4752C4] transition duration-200"
          onClick={() => clearForm()}
        >
          Log In
        </Button>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-6 lg:gap-12 mt-16">
        {/* Form Section */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6 text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl text-white font-bold leading-tight">
            CONNECT WITH THE HEART OF THE INTERNET
          </h1>
          <h2 className="text-white text-sm sm:text-base lg:text-lg font-light tracking-wide">
            Sign in or create an account to join communities, chat with friends, and explore NexusX.
          </h2>
          {error && (
            <Alert variant="destructive" className="bg-red-900 text-white border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Tabs defaultValue="login" className="w-full" onValueChange={clearForm}>
            <TabsList className="grid w-full grid-cols-2 bg-[#40444B] rounded-full mb-4">
              <TabsTrigger
                value="login"
                className="rounded-full py-2.5 text-sm sm:text-base font-medium text-gray-300 data-[state=active]:bg-[#5865F2] data-[state=active]:text-white transition duration-200"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-full py-2.5 text-sm sm:text-base font-medium text-gray-300 data-[state=active]:bg-[#5865F2] data-[state=active]:text-white transition duration-200"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="p-3 rounded-md bg-[#40444B] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865F2] text-sm sm:text-base"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="p-3 rounded-md bg-[#40444B] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865F2] text-sm sm:text-base"
                />
                <Button
                  type="submit"
                  className="w-full bg-[#5865F2] text-white font-medium rounded-full py-3 text-sm sm:text-base hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-[#5865F2] transition duration-200"
                  disabled={loading}
                  onClick={handleLogin}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={loading}
                  className="p-3 rounded-md bg-[#40444B] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865F2] text-sm sm:text-base"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="p-3 rounded-md bg-[#40444B] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865F2] text-sm sm:text-base"
                />
                <Input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="p-3 rounded-md bg-[#40444B] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865F2] text-sm sm:text-base"
                />
                <Button
                  type="submit"
                  className="w-full bg-[#5865F2] text-white font-medium rounded-full py-3 text-sm sm:text-base hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-[#5865F2] transition duration-200"
                  disabled={loading}
                  onClick={handleRegister}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center text-sm text-gray-400">
            <p>Demo credentials:</p>
            <p>Email: demo@nexusx.com</p>
            <p>Password: demo123</p>
          </div>
        </div>

        {/* Illustration Section */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          <div className="relative">
            <img
              src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/664daa37ea162cadf9603500_Art.webp"
              alt="NexusX Illustration"
              className="w-full max-w-[300px] sm:max-w-[400px] lg:max-w-[500px] rounded-lg shadow-lg object-cover"
              onError={(e) => (e.currentTarget.src = "/fallback-image.jpg")}
            />
            <img
              src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/6620ec7544fa3849c3cb27fc_party_wumpus.gif"
              alt="Party Wumpus"
              className="absolute bottom-0 left-0 w-24 sm:w-32 lg:w-40"
              onError={(e) => (e.currentTarget.src = "/fallback-image.jpg")}
            />
          </div>
        </div>
      </div>
    </div>
  )
}