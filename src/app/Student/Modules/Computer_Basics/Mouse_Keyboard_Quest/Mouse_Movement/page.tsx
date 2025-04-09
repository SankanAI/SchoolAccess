// app/Teacher/Dashboard/MouseMovement/page.tsx
"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, UserCheck, MousePointer, MousePointerClick, Maximize2, Menu } from 'lucide-react';
import Cookies from "js-cookie";
import { format } from 'date-fns';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  status: string;
  teacher_id: string;
}

interface MouseMovementProgress {
  id: string;
  student_id: string;
  click_completed: boolean;
  dblclick_completed: boolean;
  context_menu_completed: boolean;
  mouse_over_completed: boolean;
  completed: boolean;
  started_at: string;
  completed_at?: string;
  last_activity: string;
}

interface StudentWithProgress extends Student {
  progress?: MouseMovementProgress;
}
interface TaskCompletionData {
  name: string;
  completed: number;
}

export default function MouseMovementDashboard() {
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const [teacherId, setTeacherId] = useState<string>("");
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });
  const [chartData, setChartData] = useState<TaskCompletionData[]>([]);

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

  const getStudentData = async (teacherId: string) => {
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    if (studentError) {
      console.error('Error fetching students:', studentError);
      return [];
    }

    const { data: progress, error: progressError } = await supabase
      .from('mouse_movement')
      .select('*')
      .in('student_id', students.map(s => s.id));

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return [];
    }

    // Combine student data with progress data
    const studentsWithProgress = students.map(student => {
      const studentProgress = progress.find(p => p.student_id === student.id);
      return {
        ...student,
        progress: studentProgress
      };
    });

    // Calculate stats
    const completedCount = studentsWithProgress.filter(s => s.progress?.completed).length;
    const inProgressCount = studentsWithProgress.filter(s => s.progress && !s.progress.completed).length;
    const notStartedCount = studentsWithProgress.filter(s => !s.progress).length;

    setStats({
      total: studentsWithProgress.length,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: notStartedCount
    });

    // Prepare chart data
    const taskCompletionData = [
      { name: 'Click', completed: studentsWithProgress.filter(s => s.progress?.click_completed).length },
      { name: 'Double Click', completed: studentsWithProgress.filter(s => s.progress?.dblclick_completed).length },
      { name: 'Right Click', completed: studentsWithProgress.filter(s => s.progress?.context_menu_completed).length },
      { name: 'Mouse Over', completed: studentsWithProgress.filter(s => s.progress?.mouse_over_completed).length }
    ];

    setChartData(taskCompletionData);

    return studentsWithProgress;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          console.error('No teacher ID found');
          return;
        }
        
        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          console.error('Failed to decrypt teacher ID');
          return;
        }
        
        setTeacherId(decryptedId);
        
        const studentsData = await getStudentData(decryptedId);
        setStudents(studentsData);
      } catch (err) {
        console.log("there is some error", err);
        console.log(teacherId)
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
    
    return () => {
      // Cleanup code here
    };
  }, []);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Calculate progress percentage for a student
  const calculateProgress = (progress?: MouseMovementProgress) => {
    if (!progress) return 0;
    
    const tasks = [
      progress.click_completed,
      progress.dblclick_completed,
      progress.context_menu_completed,
      progress.mouse_over_completed
    ];
    
    const completedTasks = tasks.filter(task => task).length;
    return (completedTasks / tasks.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-lg font-medium">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Mouse Movement Dashboard</h1>
        <p className="text-muted-foreground">{"Track your students' progress with mouse movement exercises"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Badge className="bg-green-100 text-green-800">
              {Math.round((stats.completed / stats.total) * 100) || 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Badge className="bg-amber-100 text-amber-800">
              {Math.round((stats.inProgress / stats.total) * 100) || 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <Badge className="bg-slate-100 text-slate-800">
              {Math.round((stats.notStarted / stats.total) * 100) || 0}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notStarted}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="completion">Completion by Task</TabsTrigger>
          <TabsTrigger value="students">Student Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Progress</CardTitle>
              <CardDescription>
                Overall progress for all students in mouse movement exercises
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Total', value: stats.total },
                      { name: 'Completed', value: stats.completed },
                      { name: 'In Progress', value: stats.inProgress },
                      { name: 'Not Started', value: stats.notStarted }
                    ]}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion</CardTitle>
              <CardDescription>
                Number of students who have completed each mouse movement task
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#82ca9d" name="Students Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Details</CardTitle>
              <CardDescription>
                Individual progress for each student on mouse movement exercises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class & Section</TableHead>
                    <TableHead>Click</TableHead>
                    <TableHead>Double Click</TableHead>
                    <TableHead>Right Click</TableHead>
                    <TableHead>Mouse Over</TableHead>
                    <TableHead>Overall Progress</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const progressPercent = calculateProgress(student.progress);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(student.name)}`} />
                              <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                            </Avatar>
                            <span>{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.class} {student.section}</TableCell>
                        <TableCell>
                          {student.progress?.click_completed ? 
                            <MousePointerClick className="h-5 w-5 text-green-600" /> : 
                            <MousePointer className="h-5 w-5 text-slate-300" />}
                        </TableCell>
                        <TableCell>
                          {student.progress?.dblclick_completed ? 
                            <Maximize2 className="h-5 w-5 text-green-600" /> : 
                            <Maximize2 className="h-5 w-5 text-slate-300" />}
                        </TableCell>
                        <TableCell>
                          {student.progress?.context_menu_completed ? 
                            <Menu className="h-5 w-5 text-green-600" /> : 
                            <Menu className="h-5 w-5 text-slate-300" />}
                        </TableCell>
                        <TableCell>
                          {student.progress?.mouse_over_completed ? 
                            <MousePointer className="h-5 w-5 text-green-600" /> : 
                            <MousePointer className="h-5 w-5 text-slate-300" />}
                        </TableCell>
                        <TableCell>
                          <div className="w-full flex items-center gap-2">
                            <Progress value={progressPercent} className="h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.progress?.last_activity ? 
                            format(new Date(student.progress.last_activity), 'MMM d, yyyy h:mm a') : 
                            <span className="text-slate-400">Not started</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}