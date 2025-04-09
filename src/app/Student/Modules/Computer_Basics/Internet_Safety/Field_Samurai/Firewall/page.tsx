"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface FirewallData {
  id: string;
  current_module: string;
  total_modules: number;
  started_at: string;
  last_activity: string;
  completed: boolean;
  completed_at: string | null;
}

interface StudentData {
  id: string;
  name: string;
  class: string;
  section: string;
  firewall: FirewallData | null;
}

const getStudentData = async (teacherId: string): Promise<StudentData[]> => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, class, section')
    .eq('teacher_id', teacherId);

  if (studentsError) throw studentsError;

  const studentsWithFirewall: StudentData[] = await Promise.all(
    students.map(async (student) => {
      const { data: firewallData, error: firewallError } = await supabase
        .from('firewall')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      if (firewallError) console.log("Error fetching firewall data:", firewallError);

      return {
        id: student.id,
        name: student.name,
        class: student.class,
        section: student.section,
        firewall: firewallData || null
      };
    })
  );

  return studentsWithFirewall;
};

const FirewallDashboard = () => {
  const [teacherId, setTeacherId] = useState("");
  const [moduleData, setModuleData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          throw new Error('No teacher ID found');
        }

        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          throw new Error('Failed to decrypt teacher ID');
        }

        setTeacherId(decryptedId);
        const data = await getStudentData(decryptedId);
        setModuleData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = {
    total: moduleData.length,
    completed: moduleData.filter(s => s.firewall?.completed).length,
    active: moduleData.filter(s => s.firewall && !s.firewall.completed).length,
    notStarted: moduleData.filter(s => !s.firewall).length,
  };

  const chartData = [
    { name: 'Completed', value: stats.completed },
    { name: 'In Progress', value: stats.active },
    { name: 'Not Started', value: stats.notStarted },
  ];

  const calculateProgress = (student: StudentData) => {
    if (!student.firewall) return 0;
    if (student.firewall.completed) return 100;
    const moduleProgress = parseInt(student.firewall.current_module) || 0;
    return Math.round((moduleProgress / student.firewall.total_modules) * 100);
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
      <div className="p-4 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50">
      <h1 className='font-bold text-2xl tracking-tighter'> Firewall Learning Activity Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Student Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moduleData.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>{student.section}</TableCell>
                  <TableCell>
                    <Progress value={calculateProgress(student)} className="w-[60%]" />
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        !student.firewall
                          ? 'bg-gray-500'
                          : student.firewall.completed
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }
                    >
                      {!student.firewall
                        ? 'Not Started'
                        : student.firewall.completed
                        ? 'Completed'
                        : 'In Progress'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {student.firewall?.started_at
                      ? new Date(student.firewall.started_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {student.firewall?.last_activity
                      ? new Date(student.firewall.last_activity).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirewallDashboard;