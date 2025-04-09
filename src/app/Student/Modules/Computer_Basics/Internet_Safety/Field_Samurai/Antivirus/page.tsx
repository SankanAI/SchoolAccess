"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Target, AlertTriangle } from "lucide-react";
import Cookies from 'js-cookie';
import { createClient } from '@supabase/supabase-js';

interface StudentData {
  id: string;
  name: string;
  class: string;
  section: string;
  antivirus: {
    total_score: number;
    total_attempts: number;
    correct_attempts: number;
    incorrect_attempts: number;
    completed: boolean;
    started_at: string;
    completed_at: string | null;
  } | null;
}

const AntivirusDashboard = () => {
  const [teacherId, setTeacherId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const COLORS = ['#4ade80', '#f87171', '#60a5fa'];

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
      console.log('Decryption error:', error);
      console.log(teacherId);
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
        setStudentData(data);
      } catch (err) {
        setError('Failed to fetch data');
        console.log("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStudentData = async (teacherId: string): Promise<StudentData[]> => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    
    // Get students data
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, class, section')
      .eq('teacher_id', teacherId);
  
    if (studentsError) throw studentsError;
    
    // For each student, get their antivirus data
    const studentsWithAntivirus: StudentData[] = await Promise.all(
      students.map(async (student) => {
        const { data: antivirusData, error: antivirusError } = await supabase
          .from('antivirus')
          .select('*')
          .eq('student_id', student.id)
          .maybeSingle();
          
        if (antivirusError) console.log("Error fetching antivirus data:", antivirusError);
        
        return {
          id: student.id,
          name: student.name,
          class: student.class,
          section: student.section,
          antivirus: antivirusData || null
        };
      })
    );
    
    return studentsWithAntivirus;
  };

  const getOverallStats = () => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    studentData.forEach(student => {
      if (!student.antivirus) {
        notStarted++;
      } else if (student.antivirus.completed) {
        completed++;
      } else {
        inProgress++;
      }
    });

    return [
      { name: 'Completed', value: completed },
      { name: 'In Progress', value: inProgress },
      { name: 'Not Started', value: notStarted }
    ];
  };

  const calculateAverageScore = () => {
    const studentsWithScores = studentData.filter(student => student.antivirus?.total_score);
    if (studentsWithScores.length === 0) return 0;
    
    const totalScore = studentsWithScores.reduce((sum, student) => 
      sum + (student.antivirus?.total_score || 0), 0);
    return (totalScore / studentsWithScores.length).toFixed(1);
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
      <h1 className='font-bold text-2xl tracking-tighter'> Antivirus Learning Activity Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateAverageScore()}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((studentData.filter(s => s.antivirus?.completed).length / studentData.length) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Module Completion Status</CardTitle>
            <CardDescription>Overview of student progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getOverallStats()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getOverallStats().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Performance</CardTitle>
            <CardDescription>Detailed student progress table</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentData.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{`${student.class} ${student.section}`}</TableCell>
                      <TableCell>
                        {student.antivirus ? (
                          <div className="w-full">
                            <Progress 
                              value={student.antivirus.total_score} 
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500 mt-1">
                              {student.antivirus.total_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not started</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {!student.antivirus ? "Not Started" :
                           student.antivirus.completed ? "Completed" : "In Progress"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AntivirusDashboard;