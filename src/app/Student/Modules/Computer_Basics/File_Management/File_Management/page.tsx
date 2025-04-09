"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import Cookies from 'js-cookie';
import { createClient } from '@supabase/supabase-js';

interface StudentData {
  id: string;
  name: string;
  class: string;
  section: string;
  react_completion: boolean;
  flask_completion: boolean;
  android_completion: boolean;
  ai_completion: boolean;
  node_completion: boolean;
  vue_completion: boolean;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

interface SupabaseResponse {
  id: string;
  name: string;
  class: string;
  section: string;
  file_management?: {
    react_completion: boolean;
    flask_completion: boolean;
    android_completion: boolean;
    ai_completion: boolean;
    node_completion: boolean;
    vue_completion: boolean;
    completed: boolean;
    started_at: string;
    completed_at: string | null;
  }[];
}

const FileManagementDashboard = () => {
  const [teacherId, setTeacherId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;

  const transformData = (data: SupabaseResponse[]): StudentData[] => {
    return data.map(student => {
      const fileManagement = student.file_management?.[0] || {
        react_completion: false,
        flask_completion: false,
        android_completion: false,
        ai_completion: false,
        node_completion: false,
        vue_completion: false,
        completed: false,
        started_at: new Date().toISOString(),
        completed_at: null
      };
      
      return {
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        ...fileManagement
      };
    });
  };

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
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          setError('No teacher ID found');
          return;
        }
        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          setError('Failed to decrypt teacher ID');
          return;
        }
        setTeacherId(decryptedId);
        const data = await getStudentData(decryptedId);
        const transformedData = transformData(data);
        setStudentData(transformedData);
      } catch (err) {
        setError('Failed to fetch data');
        console.error("Error fetching data:", err);
        console.log(teacherId);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStudentData = async (teacherId: string): Promise<SupabaseResponse[]> => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        class,
        section,
        file_management (
          react_completion,
          flask_completion,
          android_completion,
          ai_completion,
          node_completion,
          vue_completion,
          completed,
          started_at,
          completed_at
        )
      `)
      .eq('teacher_id', teacherId);

    if (error) throw error;
    return data as SupabaseResponse[];
  };

  const getCompletionStats = () => {
    const stats = {
      react: 0,
      flask: 0,
      android: 0,
      ai: 0,
      node: 0,
      vue: 0
    };

    studentData.forEach(student => {
      if (student.react_completion) stats.react++;
      if (student.flask_completion) stats.flask++;
      if (student.android_completion) stats.android++;
      if (student.ai_completion) stats.ai++;
      if (student.node_completion) stats.node++;
      if (student.vue_completion) stats.vue++;
    });

    return Object.entries(stats).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      students: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <h1 className='font-bold text-2xl tracking-tighter'>File Management Activity Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>File Management Overview</CardTitle>
          <CardDescription>Student progress across different project templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getCompletionStats()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="students" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Progress Details</CardTitle>
          <CardDescription>Detailed view of individual student progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Overall Progress</TableHead>
                  <TableHead>Project Completions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentData.map((student) => {
                  const completedProjects = [
                    student.react_completion,
                    student.flask_completion,
                    student.android_completion,
                    student.ai_completion,
                    student.node_completion,
                    student.vue_completion
                  ].filter(Boolean).length;
                  
                  const progress = (completedProjects / 6) * 100;

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{`${student.class} ${student.section}`}</TableCell>
                      <TableCell>
                        <div className="w-full">
                          <Progress value={progress} className="w-full" />
                          <span className="text-sm text-gray-500 mt-1">{progress.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {student.react_completion && <Badge>React</Badge>}
                          {student.flask_completion && <Badge>Flask</Badge>}
                          {student.android_completion && <Badge>Android</Badge>}
                          {student.ai_completion && <Badge>AI</Badge>}
                          {student.node_completion && <Badge>Node</Badge>}
                          {student.vue_completion && <Badge>Vue</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {student.completed ? "Completed" : "In Progress"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileManagementDashboard;