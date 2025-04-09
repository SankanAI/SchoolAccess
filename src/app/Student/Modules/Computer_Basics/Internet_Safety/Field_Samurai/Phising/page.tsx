"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Users, Mail, CheckCircle } from 'lucide-react';

// Type definitions
interface PhishingData {
  total_score: number;
  score: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

interface Student {
  id: string;
  name: string;
  phishingData?: PhishingData;
  progress: number;
}

interface Stats {
  totalStudents: number;
  completedModule: number;
  averageScore: number;
  inProgress: number;
}

interface ChartData {
  name: string;
  score: number;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const PhishingDashboard = () => {
  const [teacherId, setTeacherId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const AlwaysFalse: boolean =false;
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    completedModule: 0,
    averageScore: 0,
    inProgress: 0
  });

  const fetchStudentData = async (teacherId: string) => {
    try {
      // Step 1: Get all students for this teacher
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, teacher_id')
        .eq('teacher_id', teacherId);
  
      if (studentsError) throw studentsError;
      
      // Step 2: Get internet safety data for these students
      const { data: internetSafetyData, error: internetSafetyError } = await supabase
        .from('internet_safety')
        .select('id, student_id, completed')
        .in('student_id', studentsData.map(s => s.id));
      
      if(AlwaysFalse){console.log(internetSafetyData)}
        
      if (internetSafetyError) throw internetSafetyError;
      
      // Step 3: Get field agent data for these internet safety records
      const { data: fieldAgentData, error: fieldAgentError } = await supabase
        .from('field_agent')
        .select('id, internet_safety_id, student_id, completed')
        .in('student_id', studentsData.map(s => s.id));

      if (fieldAgentError) throw fieldAgentError;
      
      // Step 4: Get phishing data using field_agent_id
      const { data: phishingData, error: phishingError } = await supabase
        .from('phishing')
        .select('id, field_agent_id, total_score, score, completed, started_at, completed_at')
        .in('field_agent_id', fieldAgentData.map(fa => fa.id));
        
      if (phishingError) throw phishingError;
      
      // Step 5: Join the data
      const processed: Student[] = studentsData.map(student => {
        // const internetSafety = internetSafetyData.find(is => is.student_id === student.id);
        const fieldAgent = fieldAgentData.find(fa => fa.student_id === student.id);
        const phishing = fieldAgent 
          ? phishingData.find(p => p.field_agent_id === fieldAgent.id)
          : null;
          
        return {
          ...student,
          progress: phishing?.score && phishing.total_score
            ? (phishing.score / phishing.total_score * 100)
            : 0,
          phishingData: phishing || undefined
        };
      });
  
      setStudents(processed);
      
      // Calculate stats
      const completedCount = processed.filter(s => s.phishingData?.completed).length;
      const avgScore = processed.length > 0 
        ? processed.reduce((acc, s) => acc + (s.progress || 0), 0) / processed.length
        : 0;
      
      setStats({
        totalStudents: processed.length,
        completedModule: completedCount,
        averageScore: avgScore,
        inProgress: processed.filter(s => s.phishingData?.started_at && !s.phishingData?.completed).length
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
      console.log('Decryption error:', error);
      return '';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          console.log('No teacher ID found');
          return;
        }
        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          console.log('Failed to decrypt teacher ID');
          return;
        }
        setTeacherId(decryptedId);
        await fetchStudentData(decryptedId);
      } catch (err) {
        console.log("there is some error", err);
        console.log(teacherId);
      }
    };
    fetchData();
  }, []);

  // Chart data transformation with type safety
  const chartData: ChartData[] = students.map(s => ({
    name: s.name || 'Unknown',
    score: s.progress || 0
  }));

  const calculateAverageCompletionTime = (): number => {
    const completedStudents = students.filter(s => s.phishingData?.completed);
    if (completedStudents.length === 0) return 0;

    const totalTime = completedStudents.reduce((acc, s) => {
      if (s.phishingData?.started_at && s.phishingData?.completed_at) {
        const start = new Date(s.phishingData.started_at).getTime();
        const end = new Date(s.phishingData.completed_at).getTime();
        return acc + (end - start);
      }
      return acc;
    }, 0);

    return totalTime / (completedStudents.length * 1000 * 60 * 60); // Convert to hours
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full mx-auto bg-slate-50">
      <CardHeader className="mb-8">
        <CardTitle className="text-3xl font-bold tracking-tighter">Phishing Learning Activity Module</CardTitle>
        <CardDescription>
          Monitor student progress and performance in phishing detection training
        </CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <h3 className="text-2xl font-bold">{stats.totalStudents}</h3>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <h3 className="text-2xl font-bold">{stats.completedModule}</h3>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Score</p>
                <h3 className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</h3>
              </div>
              <ArrowUpRight className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <h3 className="text-2xl font-bold">{stats.inProgress}</h3>
              </div>
              <Mail className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Student List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Student completion rates and scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>Detailed view of individual student performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        {student.phishingData?.completed ? (
                          <Badge className="bg-green-500">Completed</Badge>
                        ) : student.phishingData?.started_at ? (
                          <Badge className="bg-orange-500">In Progress</Badge>
                        ) : (
                          <Badge className="bg-gray-500">Not Started</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Progress value={student.progress} className="w-[60px]" />
                      </TableCell>
                      <TableCell>{student.progress.toFixed(1)}%</TableCell>
                      <TableCell>
                        {student.phishingData?.started_at 
                          ? new Date(student.phishingData.started_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {student.phishingData?.completed_at
                          ? new Date(student.phishingData.completed_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Detailed statistics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <Alert>
                  <AlertDescription>
                    {stats.completedModule} out of {stats.totalStudents} students have completed the module.
                    The average score is {stats.averageScore.toFixed(1)}%.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {((stats.completedModule / stats.totalStudents) * 100 || 0).toFixed(1)}%
                      </div>
                      <Progress 
                        value={(stats.completedModule / stats.totalStudents) * 100 || 0} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Average Time to Complete</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {calculateAverageCompletionTime().toFixed(1)} hours
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PhishingDashboard;