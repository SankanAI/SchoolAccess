// app/Teacher/Dashboard/Keyboard/page.tsx
"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2, UserCheck } from 'lucide-react';
import Cookies from "js-cookie";

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

interface KeyboardProgress {
  keyboard_id: string;
  student_id: string;
  completed: boolean;
  level1_score: number | null;
  level1_time: string | null;
  level2_score: number | null;
  level2_time: string | null;
  level3_score: number | null;
  level3_time: string | null;
  created_at: string;
  updated_at: string;
}


interface LevelDataItem {
  name: string;
  avgScore: number;
  studentsCompleted: number;
}

interface TimeDataItem {
  name: string;
  "Level 1": number | null;
  "Level 2": number | null;
  "Level 3": number | null;
}

interface StudentWithProgress extends Student {
  progress?: KeyboardProgress;
}

export default function KeyboardDashboard() {
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const [teacherId, setTeacherId] = useState<string>("");
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    averageScores: {
      level1: 0,
      level2: 0,
      level3: 0
    }
  });
  const [levelData, setLevelData] = useState<LevelDataItem[]>([]);
const [timeData, setTimeData] = useState<TimeDataItem[]>([]);

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

  // Helper to convert PostgreSQL interval to seconds
  const parseIntervalToSeconds = (intervalStr: string | null): number => {
    if (!intervalStr) return 0;
    
    // This is a simple parser that handles basic interval formats like "00:01:30" (1 min 30 sec)
    // For more complex formats, you'd need a more sophisticated parser
    const parts = intervalStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseFloat(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
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
      .from('keyboard')
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

    // Calculate average scores
    let totalLevel1Score = 0;
    let totalLevel2Score = 0;
    let totalLevel3Score = 0;
    let level1Count = 0;
    let level2Count = 0;
    let level3Count = 0;

    studentsWithProgress.forEach(student => {
      if (student.progress?.level1_score) {
        totalLevel1Score += student.progress.level1_score;
        level1Count++;
      }
      if (student.progress?.level2_score) {
        totalLevel2Score += student.progress.level2_score;
        level2Count++;
      }
      if (student.progress?.level3_score) {
        totalLevel3Score += student.progress.level3_score;
        level3Count++;
      }
    });

    const averageLevel1 = level1Count > 0 ? Math.round(totalLevel1Score / level1Count) : 0;
    const averageLevel2 = level2Count > 0 ? Math.round(totalLevel2Score / level2Count) : 0;
    const averageLevel3 = level3Count > 0 ? Math.round(totalLevel3Score / level3Count) : 0;

    setStats({
      total: studentsWithProgress.length,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: notStartedCount,
      averageScores: {
        level1: averageLevel1,
        level2: averageLevel2,
        level3: averageLevel3
      }
    });

    // Prepare level score data for chart
    const levelScoreData = [
      { name: 'Level 1', avgScore: averageLevel1, studentsCompleted: level1Count },
      { name: 'Level 2', avgScore: averageLevel2, studentsCompleted: level2Count },
      { name: 'Level 3', avgScore: averageLevel3, studentsCompleted: level3Count }
    ];

    setLevelData(levelScoreData);

    // Prepare time data for chart - convert intervals to seconds for comparison
    const timeData = studentsWithProgress
      .filter(s => s.progress && (s.progress.level1_time || s.progress.level2_time || s.progress.level3_time))
      .map(s => {
        const level1Seconds = parseIntervalToSeconds(s.progress?.level1_time || null);
        const level2Seconds = parseIntervalToSeconds(s.progress?.level2_time || null);
        const level3Seconds = parseIntervalToSeconds(s.progress?.level3_time || null);
        
        return {
          name: s.name,
          "Level 1": level1Seconds > 0 ? level1Seconds : null,
          "Level 2": level2Seconds > 0 ? level2Seconds : null,
          "Level 3": level3Seconds > 0 ? level3Seconds : null,
        };
      });

    setTimeData(timeData);

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
        console.log(teacherId);
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

  // Format interval string for display
  const formatInterval = (intervalStr: string | null): string => {
    if (!intervalStr) return 'N/A';
    
    const seconds = parseIntervalToSeconds(intervalStr);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate progress percentage for a student
  const calculateProgress = (progress?: KeyboardProgress) => {
    if (!progress) return 0;
    
    let completedLevels = 0;
    if (progress.level1_score !== null) completedLevels++;
    if (progress.level2_score !== null) completedLevels++;
    if (progress.level3_score !== null) completedLevels++;
    
    return (completedLevels / 3) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-lg font-medium">Loading keyboard activity data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Keyboard Activity Dashboard</h1>
        <p className="text-muted-foreground">{"Monitor your students' keyboard skills across all levels"}</p>
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
            <CardTitle className="text-sm font-medium">Completed All Levels</CardTitle>
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
          <TabsTrigger value="levels">Level Performance</TabsTrigger>
          <TabsTrigger value="time">Completion Times</TabsTrigger>
          <TabsTrigger value="students">Student Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Progress</CardTitle>
              <CardDescription>
                Overall progress for all students in keyboard exercises
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
        
        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level Performance</CardTitle>
              <CardDescription>
                Average scores and completion rates by level
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={levelData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avgScore" fill="#8884d8" name="Average Score" />
                    <Bar yAxisId="right" dataKey="studentsCompleted" fill="#82ca9d" name="Students Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completion Times</CardTitle>
              <CardDescription>
                Time taken by students to complete each level (in seconds)
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value} seconds`} />
                    <Legend />
                    <Line type="monotone" dataKey="Level 1" stroke="#8884d8" activeDot={{ r: 8 }} connectNulls />
                    <Line type="monotone" dataKey="Level 2" stroke="#82ca9d" connectNulls />
                    <Line type="monotone" dataKey="Level 3" stroke="#ffc658" connectNulls />
                  </LineChart>
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
                Individual performance metrics for each student
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class & Section</TableHead>
                    <TableHead>Level 1 Score</TableHead>
                    <TableHead>Level 1 Time</TableHead>
                    <TableHead>Level 2 Score</TableHead>
                    <TableHead>Level 2 Time</TableHead>
                    <TableHead>Level 3 Score</TableHead>
                    <TableHead>Level 3 Time</TableHead>
                    <TableHead>Overall Progress</TableHead>
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
                          {student.progress?.level1_score !== null ? 
                            <span className="font-medium">{student.progress?.level1_score}</span> : 
                            <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          {student.progress?.level1_time ? 
                            formatInterval(student.progress?.level1_time) : 
                            <span className="text-slate-400">-</span>}
                        </TableCell>
                        
                        <TableCell>
                          {student.progress?.level2_score !== null ? 
                            <span className="font-medium">{student.progress?.level2_score}</span> : 
                            <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          {student.progress?.level2_time ? 
                            formatInterval(student.progress?.level2_time) : 
                            <span className="text-slate-400">-</span>}
                        </TableCell>
                        
                        <TableCell>
                          {student.progress?.level3_score !== null ? 
                            <span className="font-medium">{student.progress?.level3_score}</span> : 
                            <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          {student.progress?.level3_time ? 
                            formatInterval(student.progress?.level3_time) : 
                            <span className="text-slate-400">-</span>}
                        </TableCell>
                        
                        <TableCell>
                          <div className="w-full flex items-center gap-2">
                            <Progress value={progressPercent} className="h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                          </div>
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