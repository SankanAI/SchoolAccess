'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, FileText, Activity, Users, ChevronDown } from 'lucide-react';
import Cookies from 'js-cookie';
import { createClient } from '@supabase/supabase-js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Secret key for decryption (should match the encryption key)
const secretKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'defaultSecretKey';

// Type definitions
interface StudentDevDetective {
  id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  first_number: number;
  second_number: number;
  operation: string;
  result: number;
  generated_code: string;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
  last_activity: string;
}

interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  status: string;
}

interface DevDetectiveStats {
  totalStudents: number;
  studentsCompleted: number;
  studentsInProgress: number;
  studentsNotStarted: number;
  averageCompletionTime: string;
  operationDistribution: { 
    name: string, 
    value: number 
  }[];
}

const DevDetectiveTeacher = () => {
  const params = useParams();
  const [teacherId, setTeacherId] = useState<string>("");
  const [students, setStudents] = useState<StudentDevDetective[]>([]);
  const [stats, setStats] = useState<DevDetectiveStats>({
    totalStudents: 0,
    studentsCompleted: 0,
    studentsInProgress: 0,
    studentsNotStarted: 0,
    averageCompletionTime: "0 mins",
    operationDistribution: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Colors for pie chart
  // const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
      return '';
    }
  };

  // Fetch student data from Supabase
  const getStudentDevDetectiveData = async (teacherId: string) => {
    try {
      // First get students assigned to this teacher
      const { data: teacherStudents, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, name, class, section, status')
        .eq('teacher_id', teacherId)
        .eq('status', 'active');
      
      if (studentError) throw studentError;
      
      if (!teacherStudents || teacherStudents.length === 0) {
        setLoading(false);
        return { devDetectiveData: [], studentList: [] };
      }
      
      // Get unique classes and sections
      const uniqueClasses = [...new Set(teacherStudents.map(student => student.class))];
      const uniqueSections = [...new Set(teacherStudents.map(student => student.section))];
      setClasses(uniqueClasses);
      setSections(uniqueSections);
      
      // Get dev detective data for these students
      const studentIds = teacherStudents.map(s => s.id);
      const { data: devDetectiveData, error: devDetectiveError } = await supabase
        .from('dev_detective')
        .select('*')
        .in('student_id', studentIds);
      
      if (devDetectiveError) throw devDetectiveError;
      
      // Combine student info with dev detective data
      const combinedData: StudentDevDetective[] = [];
      
      teacherStudents.forEach(student => {
        const devDetective = devDetectiveData?.find(d => d.student_id === student.id);
        
        if (devDetective) {
          combinedData.push({
            ...devDetective,
            name: student.name,
            class: student.class,
            section: student.section
          });
        } else {
          // Add student even if they haven't started dev detective
          combinedData.push({
            id: '',
            student_id: student.id,
            name: student.name,
            class: student.class,
            section: student.section,
            first_number: 0,
            second_number: 0,
            operation: '',
            result: 0,
            generated_code: '',
            completed: false,
            started_at: '',
            completed_at: null,
            last_activity: ''
          });
        }
      });
      
      setLoading(false);
      return { devDetectiveData: combinedData, studentList: teacherStudents };
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load student data. Please try again later.');
      setLoading(false);
      return { devDetectiveData: [], studentList: [] };
    }
  };

  // Calculate statistics
  const calculateStats = (data: StudentDevDetective[], allStudents: Student[]) => {
    // Count students with different statuses
    const totalStudents = allStudents.length;
    const studentsWithData = data.filter(s => s.started_at).length;
    const studentsCompleted = data.filter(s => s.completed).length;
    const studentsInProgress = studentsWithData - studentsCompleted;
    const studentsNotStarted = totalStudents - studentsWithData;
    
    // Calculate average completion time for completed students
    let totalCompletionTime = 0;
    let completedCount = 0;
    
    data.forEach(student => {
      if (student.completed && student.completed_at && student.started_at) {
        const start = new Date(student.started_at).getTime();
        const end = new Date(student.completed_at).getTime();
        totalCompletionTime += (end - start);
        completedCount++;
      }
    });
    
    const avgTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;
    const avgMinutes = Math.round(avgTime / (1000 * 60));
    
    // Calculate operation distribution
    const operations: Record<string, number> = {'+': 0, '-': 0, '*': 0, '/': 0};
    
    data.forEach(student => {
      if (student.operation && operations[student.operation] !== undefined) {
        operations[student.operation]++;
      }
    });
    
    const operationDistribution = Object.entries(operations).map(([name, value]) => ({
      name: name === '+' ? 'Addition' : 
            name === '-' ? 'Subtraction' : 
            name === '*' ? 'Multiplication' : 'Division',
      value
    }));
    
    return {
      totalStudents,
      studentsCompleted,
      studentsInProgress,
      studentsNotStarted,
      averageCompletionTime: `${avgMinutes} mins`,
      operationDistribution
    };
  };

  // Filter and sort data
  const getFilteredAndSortedData = () => {
    let filteredData = [...students];
    
    // Apply class filter
    if (selectedClass !== 'all') {
      filteredData = filteredData.filter(student => student.class === selectedClass);
    }
    
    // Apply section filter
    if (selectedSection !== 'all') {
      filteredData = filteredData.filter(student => student.section === selectedSection);
    }
    
    // Apply sorting
    filteredData.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'class':
          comparison = a.class.localeCompare(b.class);
          break;
        case 'completion':
          comparison = (a.completed === b.completed) ? 0 : a.completed ? -1 : 1;
          break;
        case 'date':
          const aDate = a.started_at ? new Date(a.started_at).getTime() : 0;
          const bDate = b.started_at ? new Date(b.started_at).getTime() : 0;
          comparison = aDate - bDate;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return filteredData;
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not started';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle sorting
  const handleSort = (option: string) => {
    if (sortOption === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          console.error('No teacher ID found');
          setError('No teacher ID found. Please log in again.');
          setLoading(false);
          return;
        }
        
        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          console.error('Failed to decrypt teacher ID');
          setError('Failed to authenticate. Please log in again.');
          setLoading(false);
          return;
        }
        
        setTeacherId(decryptedId);
        
        const { devDetectiveData, studentList } = await getStudentDevDetectiveData(decryptedId);
        setStudents(devDetectiveData);
        
        // Calculate statistics
        const calculatedStats = calculateStats(devDetectiveData, studentList);
        setStats(calculatedStats);
      } catch (err) {
        console.error("there is some error", err);
        setError('An error occurred while fetching data. Please try again later.');
        console.log(teacherId);
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      // Cleanup code here
    };
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-gray-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-3xl mt-8">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredData = getFilteredAndSortedData();

  return (
    <div className="container mx-auto px-4 py-8 bg-slate-50">
      <h1 className="text-3xl font-bold mb-6 tracking-tighter">Dev Detective Activity Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-3xl font-bold">{stats.totalStudents}</p>
              </div>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-3xl font-bold">{stats.studentsCompleted}</p>
                <p className="text-sm text-gray-500">
                  {stats.totalStudents > 0 ? 
                    `${Math.round((stats.studentsCompleted / stats.totalStudents) * 100)}%` : 
                    '0%'}
                </p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-3xl font-bold">{stats.studentsInProgress}</p>
                <p className="text-sm text-gray-500">
                  {stats.totalStudents > 0 ? 
                    `${Math.round((stats.studentsInProgress / stats.totalStudents) * 100)}%` : 
                    '0%'}
                </p>
              </div>
              <Activity className="w-4 h-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Not Started</p>
                <p className="text-3xl font-bold">{stats.studentsNotStarted}</p>
                <p className="text-sm text-gray-500">
                  {stats.totalStudents > 0 ? 
                    `${Math.round((stats.studentsNotStarted / stats.totalStudents) * 100)}%` : 
                    '0%'}
                </p>
              </div>
              <FileText className="w-4 h-4 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="table" className="w-full mb-8">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="table">Student Table</TabsTrigger>
          <TabsTrigger value="charts">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>
                View and filter student progress in the Dev Detective module.
              </CardDescription>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map(sec => (
                        <SelectItem key={sec} value={sec}>Section {sec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Sort by: {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleSort('name')}>
                      Name {sortOption === 'name' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('class')}>
                      Class {sortOption === 'class' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('completion')}>
                      Completion Status {sortOption === 'completion' && (sortDirection === 'asc' ? '(Incomplete first)' : '(Complete first)')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('date')}>
                      Start Date {sortOption === 'date' && (sortDirection === 'asc' ? '(Oldest first)' : '(Newest first)')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent>
              <Table>
                <TableCaption>A list of students and their progress in Dev Detective.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class & Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started on</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>Class {student.class} - {student.section || 'N/A'}</TableCell>
                        <TableCell>
                          {!student.started_at ? (
                            <Badge variant="outline" className="text-gray-500">Not Started</Badge>
                          ) : student.completed ? (
                            <Badge variant="default" className="bg-green-500">Completed</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-500 text-white">In Progress</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(student.started_at)}</TableCell>
                        <TableCell>{student.last_activity ? formatDate(student.last_activity) : 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No students match the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completion Status</CardTitle>
                <CardDescription>
                  Distribution of student progress in the Dev Detective module
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: stats.studentsCompleted },
                          { name: 'In Progress', value: stats.studentsInProgress },
                          { name: 'Not Started', value: stats.studentsNotStarted }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Completed', color: '#22c55e' },
                          { name: 'In Progress', color: '#f59e0b' },
                          { name: 'Not Started', color: '#94a3b8' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Completion Rate</span>
                      <span className="font-medium">
                        {stats.totalStudents > 0 ? 
                          `${Math.round((stats.studentsCompleted / stats.totalStudents) * 100)}%` : 
                          '0%'}
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalStudents > 0 ? 
                        (stats.studentsCompleted / stats.totalStudents) * 100 : 0
                      } 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Operations Distribution</CardTitle>
                <CardDescription>
                  Types of operations students are working with
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.operationDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#3b82f6" name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <p className="text-sm text-gray-500 mb-1">Average completion time:</p>
                  <p className="text-lg font-medium">{stats.averageCompletionTime}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Student Progress Details</CardTitle>
              <CardDescription>
                Detailed view of student activity in the Dev Detective module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Operation Type</TableHead>
                    <TableHead>First Number</TableHead>
                    <TableHead>Second Number</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Completion Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.filter(s => s.started_at).length > 0 ? (
                    filteredData
                      .filter(s => s.started_at)
                      .map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            {student.operation === '+' ? 'Addition' : 
                            student.operation === '-' ? 'Subtraction' : 
                            student.operation === '*' ? 'Multiplication' : 
                            student.operation === '/' ? 'Division' : 'N/A'}
                          </TableCell>
                          <TableCell>{student.first_number || 'N/A'}</TableCell>
                          <TableCell>{student.second_number || 'N/A'}</TableCell>
                          <TableCell>{student.result !== undefined ? student.result : 'N/A'}</TableCell>
                          <TableCell>
                            {student.completed ? (
                              <Badge variant="default" className="bg-green-500">Completed</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-500 text-white">In Progress</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        No students have started the module yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevDetectiveTeacher;