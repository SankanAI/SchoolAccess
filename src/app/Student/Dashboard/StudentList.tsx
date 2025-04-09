"use client";
import React, { useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';

// Type definitions
interface Student {
  id: number;
  name: string;
  student_id: string;
  class: string;
  section: string;
  roll_no: string;
  status: 'active' | 'inactive';
  avatar?: string;
  teacher_id: string;
}

interface EnvironmentVariables {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SECRET_KEY: string;
}

// Type guard for environment variables
const getEnvVars = (): EnvironmentVariables => {
  const vars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SECRET_KEY: process.env.NEXT_PUBLIC_SECRET_KEY,
  };

  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_ANON_KEY || !vars.NEXT_PUBLIC_SECRET_KEY) {
    throw new Error('Missing required environment variables');
  }

  return vars as EnvironmentVariables;
};

// Initialize Supabase client
const envVars = getEnvVars();
const supabase: SupabaseClient = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const StudentDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const studentsPerPage: number = 10;
  const secretKey: string = envVars.NEXT_PUBLIC_SECRET_KEY;

  const decryptData = (encryptedText: string): string => {
    try {
      const [ivBase64, encryptedBase64] = encryptedText.split('.');
      if (!ivBase64 || !encryptedBase64) return '';
      
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(secretKey).slice(0, 16);
      
      const encryptedBytes = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
      const decryptedBytes = encryptedBytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]);
      
      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  };

  const encryptData = (data: Student[]): string => {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secretKey).slice(0, 16);
    const dataBytes = encoder.encode(JSON.stringify(data));
    const encryptedBytes = dataBytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...encryptedBytes))}`;
  };

  useEffect(() => {
    const fetchStudents = async (): Promise<void> => {
      try {
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          console.error('No teacher ID found');
          setLoading(false);
          return;
        }

        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          console.error('Failed to decrypt teacher ID');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('teacher_id', decryptedId);

        if (error) {
          throw error;
        }

        if (data) {
          setStudents(data);
          // Store the encrypted data in local storage as backup
          const encryptedStudents = encryptData(data);
          localStorage.setItem('studentData', encryptedStudents);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        // Try to load data from local storage as fallback
        const storedData = localStorage.getItem('studentData');
        if (storedData) {
          try {
            const decryptedData = decryptData(storedData);
            const parsedData = JSON.parse(decryptedData) as Student[];
            setStudents(parsedData);
          } catch (e) {
            console.error('Error loading stored data:', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []); // Empty dependency array as we only want to fetch once on mount

  const totalPages: number = Math.ceil(students.length / studentsPerPage);
  const currentStudents: Student[] = students.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl tracking-tighter mb-8">Student Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentStudents.map((student) => (
          <Card key={student.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={student.avatar} alt={student.name} />
                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{student.name}</CardTitle>
                <p className="text-sm text-gray-500">ID: {student.student_id}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Class:</span>
                  <span>{student.class} {student.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Roll No:</span>
                  <span>{student.roll_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <Badge>
                    {student.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-8">
        {[...Array(totalPages)].map((_, index) => (
          <Button
            key={index + 1}
            variant={currentPage === index + 1 ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StudentDashboard;