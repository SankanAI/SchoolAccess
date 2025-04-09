"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Cookies from 'js-cookie';
import { createClient } from '@supabase/supabase-js';

interface StudentFileData {
  id: string;
  name: string;
  class: string;
  section: string;
  alphabetical_sort_completed: boolean;
  numerical_sort_completed: boolean;
  content_copy_completed: boolean;
  content_validation_completed: boolean;
  append_operation_completed: boolean;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

interface ChartData {
  name: string;
  completed: number;
  inProgress: number;
  notStarted: number;
}

const FileOperationsDashboard = () => {
  const [teacherId, setTeacherId] = useState<string>("");
  const [studentsData, setStudentsData] = useState<StudentFileData[]>([]);
  const [loading, setLoading] = useState(true);
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const [error, setError] = useState<string | null>(null);

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
      console.log(teacherId);
      return '';
    }
  };
  
  const fetchStudentData = async (teacherId: string): Promise<StudentFileData[]> => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  
    const { data, error } = await supabase
      .from('students')
      .select(
        `
        id,
        name,
        class,
        section,
        file_operations (
          alphabetical_sort_completed,
          numerical_sort_completed,
          content_copy_completed,
          content_validation_completed,
          append_operation_completed,
          completed,
          started_at,
          completed_at
        )
      `
      )
      .eq('teacher_id', teacherId);
  
    if (error) throw error;
  
    // Transform response to flatten file_operations
    return data.map((student) => {
      // Get the first file_operations entry or use default values
      const fileOps = student.file_operations && student.file_operations[0] ? 
        student.file_operations[0] : 
        {
          alphabetical_sort_completed: false,
          numerical_sort_completed: false,
          content_copy_completed: false,
          content_validation_completed: false,
          append_operation_completed: false,
          completed: false,
          started_at: new Date().toISOString(),
          completed_at: null
        };
      
      return {
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        alphabetical_sort_completed: fileOps.alphabetical_sort_completed,
        numerical_sort_completed: fileOps.numerical_sort_completed,
        content_copy_completed: fileOps.content_copy_completed,
        content_validation_completed: fileOps.content_validation_completed,
        append_operation_completed: fileOps.append_operation_completed,
        completed: fileOps.completed,
        started_at: fileOps.started_at,
        completed_at: fileOps.completed_at
      };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
        const data = await fetchStudentData(decryptedId);
        setStudentsData(data);
      } catch (err) {
        setError('Failed to fetch student data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateProgress = (student: StudentFileData): number => {
    const tasks = [
      student.alphabetical_sort_completed,
      student.numerical_sort_completed,
      student.content_copy_completed,
      student.content_validation_completed,
      student.append_operation_completed
    ];
    
    const completedTasks = tasks.filter(task => task).length;
    return (completedTasks / tasks.length) * 100;
  };

  const getChartData = (): ChartData[] => {
    const taskTypes = [
      'Alphabetical Sort',
      'Numerical Sort',
      'Content Copy',
      'Content Validation',
      'Append Operation'
    ];

    return taskTypes.map(task => {
      const taskKey = task.toLowerCase().replace(/ /g, '_') + '_completed';
      const total = studentsData.length;
      const completed = studentsData.filter(s => s[taskKey as keyof StudentFileData]).length;
      const inProgress = studentsData.filter(s => !s[taskKey as keyof StudentFileData] && s.started_at).length;
      const notStarted = total - completed - inProgress;

      return {
        name: task,
        completed,
        inProgress,
        notStarted
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <h1 className='font-bold text-2xl tracking-tighter'>File Operations Activity Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>File Operations Progress Dashboard</CardTitle>
          <CardDescription>Track student progress in file operation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Progress Chart */}
            <Card className="p-4">
              <CardHeader>
                <CardTitle>Task Completion Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                      <Bar dataKey="inProgress" stackId="a" fill="#eab308" name="In Progress" />
                      <Bar dataKey="notStarted" stackId="a" fill="#ef4444" name="Not Started" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Student Progress Table */}
            <Card>
              <CardHeader>
                <CardTitle>Student Progress Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsData.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.section}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={calculateProgress(student)} className="w-[60%]" />
                            <span className="text-sm text-gray-500">
                              {Math.round(calculateProgress(student))}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.completed ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Completed
                            </div>
                          ) : (
                            <div className="flex items-center text-yellow-600">
                              <Clock className="mr-1 h-4 w-4" />
                              In Progress
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{new Date(student.started_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {student.completed_at 
                            ? new Date(student.completed_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileOperationsDashboard;