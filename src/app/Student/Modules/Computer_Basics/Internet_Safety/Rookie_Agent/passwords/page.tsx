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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Users, CheckCircle, Clock } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentData {
  id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  status: string;
  file_safety: {
    completed: boolean;
    started_at: string;
    completed_at: string | null;
    last_activity: string;
  } | null;
}

interface ModuleData {
  total_students: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completion_rate: number;
  average_time: number;
}

const SafeObjectDashboard = () => {
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;
  const [teacherId, setTeacherId] = useState("");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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
      console.error('Decryption error:', error);
      console.log(teacherId);
      return '';
    }
  };

  const fetchStudentData = async (teacherId: string) => {
    try {
      // First, get all students for this teacher
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          name,
          class,
          section,
          status
        `)
        .eq('teacher_id', teacherId);

      if (studentsError) throw studentsError;

      // Then, get file safety data for these students
      const studentIds = studentsData.map(s => s.id);
      const { data: fileSafetyData, error: fileSafetyError } = await supabase
        .from('file_safety')
        .select('*')
        .in('student_id', studentIds);

      if (fileSafetyError) throw fileSafetyError;

      // Combine the data
      const combinedData = studentsData.map(student => ({
        ...student,
        file_safety: fileSafetyData?.find(fs => fs.student_id === student.id) || null
      }));

      return combinedData;
    } catch (error) {
      console.error('Error fetching student data:', error);
      return [];
    }
  };

  const processModuleData = (data: StudentData[]): ModuleData => {
    const total = data.length;
    const completed = data.filter(d => d.file_safety?.completed).length;
    const inProgress = data.filter(d => d.file_safety && !d.file_safety.completed).length;
    const notStarted = total - completed - inProgress;

    const completedStudents = data.filter(d => 
      d.file_safety?.completed && d.file_safety.completed_at && d.file_safety.started_at
    );

    let avgTime = 0;
    if (completedStudents.length > 0) {
      const totalTime = completedStudents.reduce((acc, curr) => {
        const start = new Date(curr.file_safety!.started_at).getTime();
        const end = new Date(curr.file_safety!.completed_at!).getTime();
        return acc + (end - start);
      }, 0);
      avgTime = totalTime / completedStudents.length / (1000 * 60); // Convert to minutes
    }

    return {
      total_students: total,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      completion_rate: (completed / total) * 100,
      average_time: avgTime
    };
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
        const studentsData = await fetchStudentData(decryptedId);
        setStudents(studentsData);
        setModuleData(processModuleData(studentsData));
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = [
    { name: 'Completed', value: moduleData?.completed || 0 },
    { name: 'In Progress', value: moduleData?.in_progress || 0 },
    { name: 'Not Started', value: moduleData?.not_started || 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-slate-50">
      <CardHeader className="pb-8">
        <CardTitle className="text-3xl font-bold tracking-tighter">Passwords Activity Learning Module</CardTitle>
        <CardDescription>
          Track student progress in file safety and object management training
        </CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{moduleData?.total_students}</p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{moduleData?.completed}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{moduleData?.in_progress}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Shield className="h-8 w-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {moduleData?.completion_rate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Completion Rate</p>
              </div>
            </div>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Module Progress Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Overall Progress</div>
                      <div className="text-sm text-gray-500">
                        {moduleData?.completion_rate.toFixed(1)}%
                      </div>
                    </div>
                    <Progress value={moduleData?.completion_rate || 0} />
                  </div>

                  <Alert>
                    <AlertTitle>Average Completion Time</AlertTitle>
                    <AlertDescription>
                      {moduleData?.average_time.toFixed(0)} minutes
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Student Progress Tracking</CardTitle>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {Array.from(new Set(students.map(s => s.class))).map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students
                    .filter(s => selectedClass === 'all' || s.class === selectedClass)
                    .map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.student_id}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.section}</TableCell>
                        <TableCell>
                          <Badge
                          >
                            {student.file_safety?.completed ? "Completed" : 
                             student.file_safety ? "In Progress" : "Not Started"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.file_safety?.last_activity ? 
                            new Date(student.file_safety.last_activity).toLocaleDateString() :
                            "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Class-wise Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from(new Set(students.map(s => s.class))).map(className => {
                    const classStudents = students.filter(s => s.class === className);
                    const completed = classStudents.filter(s => s.file_safety?.completed).length;
                    const total = classStudents.length;
                    const completionRate = (completed / total) * 100;

                    return (
                      <Card key={className}>
                        <CardHeader>
                          <CardTitle className="text-lg">Class {className}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Completion Rate</span>
                              <span>{completionRate.toFixed(1)}%</span></div>
                            <Progress value={completionRate} />
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              <div>
                                <p className="text-sm text-gray-500">Total</p>
                                <p className="text-lg font-bold">{total}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Completed</p>
                                <p className="text-lg font-bold">{completed}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Completion Time Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const timeDistribution = students
                          .filter(s => s.file_safety?.completed)
                          .reduce((acc, student) => {
                            const start = new Date(student.file_safety!.started_at);
                            const end = new Date(student.file_safety!.completed_at!);
                            const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
                            
                            if (duration <= 30) acc['0-30 mins']++;
                            else if (duration <= 60) acc['30-60 mins']++;
                            else acc['60+ mins']++;
                            
                            return acc;
                          }, {'0-30 mins': 0, '30-60 mins': 0, '60+ mins': 0});

                        return (
                          <div className="space-y-4">
                            {Object.entries(timeDistribution).map(([range, count]) => (
                              <div key={range} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>{range}</span>
                                  <span className="font-medium">{count} students</span>
                                </div>
                                <Progress 
                                  value={count === 0 ? 0 : (count / students.length) * 100} 
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activity Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {students
                          .filter(s => s.file_safety?.last_activity)
                          .sort((a, b) => 
                            new Date(b.file_safety!.last_activity).getTime() - 
                            new Date(a.file_safety!.last_activity).getTime()
                          )
                          .slice(0, 5)
                          .map(student => (
                            <div key={student.id} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(student.file_safety!.last_activity).toLocaleString()}
                                </p>
                              </div>
                              <Badge>
                                {student.file_safety?.completed ? "Completed" : "Active"}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Module Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert>
                    <AlertTitle>Performance Summary</AlertTitle>
                    <AlertDescription>
                      Out of {moduleData?.total_students} students, {moduleData?.completed} have completed the module, 
                      with an average completion time of {moduleData?.average_time.toFixed(0)} minutes.
                      The overall completion rate is {moduleData?.completion_rate.toFixed(1)}%.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {students.filter(s => 
                              s.file_safety?.completed_at && 
                              new Date(s.file_safety.completed_at).getTime() - 
                              new Date(s.file_safety.started_at).getTime() < 
                              moduleData!.average_time * 60 * 1000
                            ).length}
                          </div>
                          <p className="text-sm text-gray-500">
                            Completed Below Average Time
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {students.filter(s => 
                              s.file_safety?.started_at && 
                              !s.file_safety.completed_at && 
                              new Date().getTime() - 
                              new Date(s.file_safety.started_at).getTime() > 
                              7 * 24 * 60 * 60 * 1000
                            ).length}
                          </div>
                          <p className="text-sm text-gray-500">
                            Inactive for 7+ Days
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {students.filter(s => 
                              s.file_safety?.last_activity && 
                              new Date().getTime() - 
                              new Date(s.file_safety.last_activity).getTime() < 
                              24 * 60 * 60 * 1000
                            ).length}
                          </div>
                          <p className="text-sm text-gray-500">
                            Active in Last 24 Hours
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SafeObjectDashboard;