'use client'

import { useState } from 'react'
import { useRouter} from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Cookies from "js-cookie";

export default function TeacherLoginUI() {
  const [teacherId, setTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false);
  const secretKey= process.env.NEXT_PUBLIC_SECRET_KEY;
  const [toast, setToast] = useState({
    show: false,
    title: '',
    description: '',
    type: 'default'
  })
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const showToast = (title: string, description: string, type: 'default' | 'destructive' = 'default') => {
    setToast({ show: true, title, description, type })
    setTimeout(() => {
      setToast({ show: false, title: '', description: '', type: 'default' })
    }, 3000)
  }


  const encryptData = (text: string): string => {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secretKey).slice(0, 16); // Use the first 16 bytes for AES key
    const iv = crypto.getRandomValues(new Uint8Array(16)); // Initialization vector
    const ivString = btoa(String.fromCharCode(...iv));
    
    const textBytes = encoder.encode(text);
    const encryptedBytes = textBytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]); // XOR for encryption
    
    const encryptedString = btoa(String.fromCharCode(...encryptedBytes));
    return `${ivString}.${encryptedString}`;
  };

  const handleTeacherLogin = async () => {
    if (!teacherId || !password) {
      showToast('Error', 'Teacher ID and password are required', 'destructive')
      return
    }

    try {
      setLoading(true)
      
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('teacher_id', teacherId)
        .single()

      if (teacherError || !teacherData) {
        showToast('Login Error', 'Invalid teacher credentials', 'destructive')
        return
      }

      const encryptedId = encryptData(teacherData.teacher_id);
      
      // Set cookies with encrypted ID and role
      Cookies.set("teacherId", encryptedId, {
        expires: 1/24,
        secure: true,
        sameSite: "strict"
      });

      Cookies.set("teacherFound", "true", {
        expires: 1/24,
        secure: true,
        sameSite: "strict"
      })


      showToast('Success', 'Login successful')
      router.push('/Teacher/Dashboard')
      
    } catch (err) {
      console.log('Unexpected error during login:', err)
      showToast('Unexpected Error', 'An unexpected error occurred', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-[400px] max-w-lg bg-gray-900 border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Teacher Login
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacherId" className="text-gray-300">Teacher ID</Label>
            <Input
              id="teacherId"
              placeholder="Enter your Teacher ID"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <Button
            onClick={handleTeacherLogin}
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>

      {toast.show && (
        <Alert
          variant={toast.type === 'destructive' ? 'destructive' : 'default'}
          className="fixed top-4 right-4 w-96 animate-in fade-in slide-in-from-top-2 bg-gray-800 border-gray-700 text-white"
        >
          <AlertTitle className="text-white">{toast.title}</AlertTitle>
          <AlertDescription className="text-gray-300">{toast.description}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}