'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import Cookies from 'js-cookie'
import bcrypt from 'bcryptjs'

export default function PrincipalLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({
    show: false,
    title: '',
    description: '',
    type: 'default'
  })
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (Cookies.get('userId')) {
      // router.push('/')
    }
  }, [])

  const showToast = (title: string, description: string, type: 'default' | 'destructive' = 'default') => {
    setToast({ show: true, title, description, type })
    setTimeout(() => {
      setToast({ show: false, title: '', description: '', type: 'default' })
    }, 3000)
  }

  const handlePrincipalLogin = async () => {
    try {
      setLoading(true)

      if (!email || !password) {
        showToast('Error', 'Email and password are required', 'destructive')
        return
      }

      // Query the principals table directly using email
      const { data: principalData, error: principalError } = await supabase
        .from('principles') // Note: keeping your table name 'principles'
        .select('*')
        .eq('email', email)
        .single()

      if (principalError || !principalData) {
        showToast('Login Error', 'Invalid email or password', 'destructive')
        return
      }

      // Compare the entered password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, principalData.password)
      
      if (!isPasswordValid) {
        showToast('Login Error', 'Invalid email or password', 'destructive')
        return
      }

      if (principalData.verified !== true) {
        showToast('Account Not Verified', 'Your account is pending verification. Please check your email or contact support.', 'destructive')
        return
      }

      // Check if account is verified
      if (!principalData.verified) {
        showToast('Account Not Verified', 'Your account is pending verification. Please check your email or contact support.', 'destructive')
        return
      }

      // Fetch school data associated with this principal
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('principle_id', principalData.id)
        .single()

      if (schoolError || !schoolData) {
        showToast('Error', 'No school associated with this principal', 'destructive')
        return
      }

      // Set cookies with principal data
      Cookies.set('userId', principalData.user_id || principalData.id, {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })

      Cookies.set('userEmail', principalData.email, {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })

      Cookies.set('principalId', principalData.id, {
        expires: 7,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })

      showToast('Success', 'Login successful', 'default')
      router.push(`/Principal/Dashboard/TeacherRegistration?principalId=${principalData.id}&schoolId=${schoolData.id}`)

    } catch (err) {
      console.error('Login error:', err)
      showToast('Unexpected Error', 'An unexpected error occurred', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-[350px] max-w-lg mt-[-5vh] border-gray-800 bg-gray-900">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Principal Login</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Button
            onClick={handlePrincipalLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>

      {toast.show && (
        <Alert
          variant={toast.type === 'destructive' ? 'destructive' : 'default'}
          className={`fixed top-4 right-4 w-96 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'destructive' 
              ? 'border-red-900 bg-red-950 text-red-50' 
              : 'border-green-900 bg-green-950 text-green-50'
          }`}
        >
          <AlertTitle className="text-white">{toast.title}</AlertTitle>
          <AlertDescription className={toast.type === 'destructive' ? 'text-red-200' : 'text-green-200'}>
            {toast.description}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}