"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useRouter } from 'next/navigation'

interface PrincipalFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  schoolName: string;
  schoolAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  schoolType: string;
  board: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
}

export default function PrincipalRegistrationForm() {
  const [output, setOutput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [authUser, setAuthUser] = useState<string>('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<PrincipalFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      schoolName: "",
      schoolAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
      },
      schoolType: "",
      board: "",
      registrationNumber: "",
      contactEmail: "",
      contactPhone: "",
    }
  })

  const onSubmit = async (data: PrincipalFormData) => {
    try {
      setLoading(true)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: 'principal'
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("User data is not available.")
      }

      setAuthUser(authData.user.id)

      const { data: principalData, error: principalError } = await supabase
        .from('principles')
        .insert({
          user_id: authData.user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          verified: false
        })
        .select('id')
        .single()

      if (principalError) throw principalError

      const { error: schoolError } = await supabase
        .from('schools')
        .insert({
          principle_id: principalData.id,
          name: data.schoolName,
          school_type: data.schoolType,
          board: data.board,
          registration_number: data.registrationNumber
        })

      if (schoolError) throw schoolError

      setOutput('Registration successful! Please wait for admin verification.')
      router.push('/Principal/login')
      
    } catch (error: any) {
      console.log('Registration error:', error)
      setOutput(error.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 flex items-center justify-center p-2">
      <div className="w-full max-w-3xl mt-[-8vh]">
        <Card className="w-full bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Principal Registration</CardTitle>
            <CardDescription className="text-gray-400">
              Create your account to manage your school
            </CardDescription>
            {output && (
              <Alert variant={output.includes('error') ? 'destructive' : 'default'} className="bg-gray-800 border-gray-700">
                <AlertTitle className="text-white">{output.includes('error') ? 'Error' : 'Success'}</AlertTitle>
                <AlertDescription className="text-gray-300">{output}</AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="principal" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">Principal Details</TabsTrigger>
                <TabsTrigger value="school" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white">School Details</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <TabsContent value="principal">
                  <div className="space-y-4 w-[75%] ml-[12.5%]">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter your name"
                        {...register("name", {
                          required: "Name is required",
                          minLength: {
                            value: 2,
                            message: "Name must be at least 2 characters"
                          }
                        })}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-400">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address"
                          }
                        })}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-400">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        {...register("phone", {
                          required: "Phone number is required",
                          pattern: {
                            value: /^\d{10}$/,
                            message: "Invalid phone number"
                          }
                        })}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-400">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a password"
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters"
                          }
                        })}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      {errors.password && (
                        <p className="text-sm text-red-400">{errors.password.message}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="school">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="text-gray-300">School Name</Label>
                      <Input
                        id="schoolName"
                        placeholder="Enter school name"
                        {...register("schoolName", {
                          required: "School name is required"
                        })}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      {errors.schoolName && (
                        <p className="text-sm text-red-400">{errors.schoolName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolType" className="text-gray-300">School Type</Label>
                      <Select
                        onValueChange={(value) => setValue("schoolType", value)}
                        defaultValue={watch("schoolType")}
                      >
                        <SelectTrigger id="schoolType" className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select school type" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="charter">Charter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="board" className="text-gray-300">Board</Label>
                      <Select
                        onValueChange={(value) => setValue("board", value)}
                        defaultValue={watch("board")}
                      >
                        <SelectTrigger id="board" className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select board" className="text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="cbse">CBSE</SelectItem>
                          <SelectItem value="icse">ICSE</SelectItem>
                          <SelectItem value="state">State Board</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber" className="text-gray-300">Registration Number</Label>
                      <Input
                        id="registrationNumber"
                        placeholder="Enter registration number"
                        {...register("registrationNumber", {
                          required: "Registration number is required"
                        })}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      {errors.registrationNumber && (
                        <p className="text-sm text-red-400">{errors.registrationNumber.message}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-700 hover:bg-indigo-600 text-white" 
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Complete Registration'}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}