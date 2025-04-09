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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Users, UserCheck, UserX } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentData {
  id: string;
  name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  completion_time?: number;
}

interface ModuleStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  averageCompletionTime: number;
}

const EncryptionDashboard = () => {
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const [teacherId, setTeacherId] = useState("");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [stats, setStats] = useState<ModuleStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    averageCompletionTime: 0,
  });
  const [timeFilter, setTimeFilter] = useState("all");

  // Decryption function
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

  // Modified fetch function to use separate queries
  const fetchStudentData = async (teacherId: string) => {
    try {
      // First, get all students for this teacher
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, name')
        .eq('teacher_id', teacherId);

      if (studentError) throw studentError;
      if (!studentData) return;

      // Get encryption data for these students
      const studentIds = studentData.map(student => student.id);
      const { data: encryptionData, error: encryptionError } = await supabase
        .from('encryption')
        .select('*')
        .in('student_id', studentIds);

      if (encryptionError) throw encryptionError;

      // Combine the data
      const processedData: StudentData[] = studentData.map(student => {
        const encryptionEntry = encryptionData?.find(entry => entry.student_id === student.id);
        
        return {
          id: student.id,
          name: student.name,
          status: encryptionEntry?.completed ? 'Completed' 
                 : encryptionEntry?.started_at ? 'In Progress' 
                 : 'Not Started',
          started_at: encryptionEntry?.started_at || new Date().toISOString(),
          completed_at: encryptionEntry?.completed_at || null,
          completion_time: encryptionEntry?.completed_at 
            ? Math.round((new Date(encryptionEntry.completed_at).getTime() - new Date(encryptionEntry.started_at).getTime()) / (1000 * 60))
            : undefined
        };
      });

      setStudents(processedData);
      calculateStats(processedData);
    } catch (error) {
      console.log('Error fetching data:', error);
    }
  };

  // Calculate statistics
  const calculateStats = (data: StudentData[]) => {
    const completed = data.filter(s => s.status === 'Completed').length;
    const inProgress = data.filter(s => s.status === 'In Progress').length;
    const notStarted = data.filter(s => s.status === 'Not Started').length;
    
    const completionTimes = data
      .filter((s): s is StudentData & { completion_time: number } => 
        s.completion_time !== undefined
      )
      .map(s => s.completion_time);
    
    const avgTime = completionTimes.length 
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    setStats({
      total: data.length,
      completed,
      inProgress,
      notStarted,
      averageCompletionTime: avgTime
    });
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
      }
    };
    fetchData();
  }, []);

  const getChartData = () => {
    return [
      { name: 'Completed', value: stats.completed, id: 'completed' },
      { name: 'In Progress', value: stats.inProgress, id: 'in-progress' },
      { name: 'Not Started', value: stats.notStarted, id: 'not-started' }
    ];
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tighter">Encryption Module Dashboard</h1>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Time Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <Progress value={(stats.completed / stats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <Progress value={(stats.inProgress / stats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageCompletionTime} mins</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Module Progress Overview</CardTitle>
              <CardDescription>
                Visual representation of student progress in the Encryption module
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>
                Detailed view of individual student progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Time Taken</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <Badge>{student.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(student.started_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {student.completed_at
                          ? new Date(student.completed_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {student.completion_time
                          ? `${student.completion_time} mins`
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
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Detailed analysis of student performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Completion Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {((stats.completed / stats.total) * 100).toFixed(1)}%
                      </div>
                      <Progress
                        value={(stats.completed / stats.total) * 100}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Average Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {((stats.completed + stats.inProgress * 0.5) / stats.total * 100).toFixed(1)}%
                      </div>
                      <Progress
                        value={(stats.completed + stats.inProgress * 0.5) / stats.total * 100}
                        className="mt-2"
                      />
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

export default EncryptionDashboard;