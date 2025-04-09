"use client";
// pages/teacher/file-management-dashboard.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle, FileText, Loader2, RefreshCw, Users } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Secret key for decryption (should match the encryption key)
const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY;

// Types for our data
interface Student {
  id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  status: string;
}

interface FileManagementData {
  student_id: string;
  student_name: string;
  completed: boolean;
  react_completion: boolean;
  flask_completion: boolean;
  android_completion: boolean;
  ai_completion: boolean;
  node_completion: boolean;
  vue_completion: boolean;
  started_at: string;
  completed_at: string | null;
  last_activity: string;
}

interface CompletionStats {
  name: string;
  value: number;
  color: string;
}

interface ProjectCompletionStats {
  name: string;
  completed: number;
  pending: number;
}

const AutomatedFileManagementDashboard = () => {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fileManagementData, setFileManagementData] = useState<FileManagementData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);
  const [uniqueSections, setUniqueSections] = useState<string[]>([]);
  const [completionStats, setCompletionStats] = useState<CompletionStats[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectCompletionStats[]>([]);

  // Decrypt function for Teacher ID
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

  // Fetch Students assigned to this teacher
  const fetchStudents = async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, name, class, section, status')
        .eq('teacher_id', teacherId)
        .eq('status', 'active');

      if (error) throw error;
      
      // Get unique classes and sections for filtering
      const classes = [...new Set(data.map(student => student.class))];
      const sections = [...new Set(data.map(student => student.section))];
      
      setStudents(data);
      setUniqueClasses(classes);
      setUniqueSections(sections);
      
      return data;
    } catch (err) {
      console.error('Error fetching students:', err);
      return [];
    }
  };

  // Fetch Automated File Management data
  const fetchFileManagementData = async (studentIds: string[]) => {
    try {
      if (!studentIds.length) return [];

      const { data, error } = await supabase
        .from('automated_file_management')
        .select(`
          *,
          students!inner(name, id, student_id)
        `)
        .in('student_id', studentIds);

      if (error) throw error;

      // Transform data for our component
      const transformedData = data.map(item => ({
        student_id: item.student_id,
        student_name: item.students.name,
        completed: item.completed,
        react_completion: item.react_completion,
        flask_completion: item.flask_completion,
        android_completion: item.android_completion,
        ai_completion: item.ai_completion,
        node_completion: item.node_completion,
        vue_completion: item.vue_completion,
        started_at: item.started_at,
        completed_at: item.completed_at,
        last_activity: item.last_activity
      }));

      setFileManagementData(transformedData);
      generateStats(transformedData);
      
      return transformedData;
    } catch (err) {
      console.error('Error fetching file management data:', err);
      return [];
    }
  };

  // Generate statistics for charts
  const generateStats = (data: FileManagementData[]) => {
    // Overall completion stats
    const completed = data.filter(item => item.completed).length;
    const inProgress = data.filter(item => !item.completed && (
      item.react_completion || item.flask_completion || item.android_completion ||
      item.ai_completion || item.node_completion || item.vue_completion
    )).length;
    const notStarted = data.length - completed - inProgress;

    const completionData = [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'In Progress', value: inProgress, color: '#f59e0b' },
      { name: 'Not Started', value: notStarted, color: '#ef4444' }
    ];

    // Project-specific completion stats
    const projectData = [
      { 
        name: 'React', 
        completed: data.filter(item => item.react_completion).length,
        pending: data.filter(item => !item.react_completion).length
      },
      { 
        name: 'Flask', 
        completed: data.filter(item => item.flask_completion).length,
        pending: data.filter(item => !item.flask_completion).length
      },
      { 
        name: 'Android', 
        completed: data.filter(item => item.android_completion).length,
        pending: data.filter(item => !item.android_completion).length
      },
      { 
        name: 'AI', 
        completed: data.filter(item => item.ai_completion).length,
        pending: data.filter(item => !item.ai_completion).length
      },
      { 
        name: 'Node.js', 
        completed: data.filter(item => item.node_completion).length,
        pending: data.filter(item => !item.node_completion).length
      },
      { 
        name: 'Vue', 
        completed: data.filter(item => item.vue_completion).length,
        pending: data.filter(item => !item.vue_completion).length
      }
    ];

    setCompletionStats(completionData);
    setProjectStats(projectData);
  };

  // Filter data based on class and section
  const getFilteredData = () => {
    let filteredData = [...fileManagementData];
    
    // Apply filters based on current student list
    const filteredStudents = students.filter(student => {
      if (selectedClass !== 'all' && student.class !== selectedClass) return false;
      if (selectedSection !== 'all' && student.section !== selectedSection) return false;
      return true;
    });
    
    const filteredStudentIds = filteredStudents.map(s => s.id);
    filteredData = fileManagementData.filter(d => filteredStudentIds.includes(d.student_id));
    
    return filteredData;
  };

  // Calculate completion percentage for a student
  const calculateCompletionPercentage = (data: FileManagementData) => {
    const totalProjects = 6; // React, Flask, Android, AI, Node, Vue
    const completedProjects = [
      data.react_completion,
      data.flask_completion,
      data.android_completion,
      data.ai_completion,
      data.node_completion,
      data.vue_completion
    ].filter(Boolean).length;
    
    return Math.round((completedProjects / totalProjects) * 100);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userIdCookie = Cookies.get('teacherId');
        if (!userIdCookie) {
          console.error('No teacher ID found');
          router.push('/login');
          return;
        }
        
        const decryptedId = decryptData(userIdCookie);
        if (!decryptedId) {
          console.error('Failed to decrypt teacher ID');
          router.push('/login');
          return;
        }
        
        setTeacherId(decryptedId);
        
        // Fetch students and then fetch file management data
        const studentsData = await fetchStudents(decryptedId);
        if (studentsData.length) {
          const studentIds = studentsData.map(s => s.id);
          await fetchFileManagementData(studentIds);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Effect to refresh stats when filters change
  useEffect(() => {
    const filteredData = getFilteredData();
    generateStats(filteredData);
  }, [selectedClass, selectedSection, fileManagementData]);

  // Refresh data handler
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const studentsData = await fetchStudents(teacherId);
      if (studentsData.length) {
        const studentIds = studentsData.map(s => s.id);
        await fetchFileManagementData(studentIds);
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
      console.log(teacherId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tighter">Automated File Management</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading dashboard data...</span>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Filter Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select 
                    value={selectedClass} 
                    onValueChange={setSelectedClass}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {uniqueClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={selectedSection} 
                    onValueChange={setSelectedSection}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {uniqueSections.map(section => (
                        <SelectItem key={section} value={section}>Section {section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Student Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {completionStats.find(s => s.name === 'Completed')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-500">
                      {completionStats.find(s => s.name === 'In Progress')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-500">In Progress</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-500">
                      {completionStats.find(s => s.name === 'Not Started')?.value || 0}
                    </div>
                    <div className="text-sm text-gray-500">Not Started</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Module Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Progress
                      value={fileManagementData.length > 0 
                        ? (completionStats.find(s => s.name === 'Completed')?.value || 0) / fileManagementData.length * 100
                        : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="text-sm font-medium">
                    {fileManagementData.length > 0 
                      ? Math.round((completionStats.find(s => s.name === 'Completed')?.value || 0) / fileManagementData.length * 100)
                      : 0
                    }%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="analytics" className="space-y-4">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="students">Student Progress</TabsTrigger>
            </TabsList>
            
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>Overall Completion Status</CardTitle>
                    <CardDescription>Distribution of module completion across students</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={completionStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {completionStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} students`, '']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>Project Completion Progress</CardTitle>
                    <CardDescription>Status of each project type across students</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projectStats}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                          <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Details</CardTitle>
                  <CardDescription>
                    Detailed view of each student's automated file management module progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {getFilteredData().length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium">No data available</h3>
                      <p className="text-sm text-gray-500 mt-2">
                        {students.length === 0 
                          ? "No students are assigned to you yet."
                          : "No students found with the selected filters or no students have started this module."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Student</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>React</TableHead>
                            <TableHead>Flask</TableHead>
                            <TableHead>Android</TableHead>
                            <TableHead>AI</TableHead>
                            <TableHead>Node.js</TableHead>
                            <TableHead>Vue</TableHead>
                            <TableHead>Last Activity</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredData().map((item) => (
                            <TableRow key={item.student_id}>
                              <TableCell className="font-medium">{item.student_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Progress
                                    value={calculateCompletionPercentage(item)}
                                    className="h-2"
                                  />
                                  <span className="text-xs font-medium">
                                    {calculateCompletionPercentage(item)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.react_completion ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="h-5 w-5 inline-block rounded-full bg-gray-200" />
                                )}
                              </TableCell>
                              <TableCell>
                                {item.flask_completion ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="h-5 w-5 inline-block rounded-full bg-gray-200" />
                                )}
                              </TableCell>
                              <TableCell>
                                {item.android_completion ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="h-5 w-5 inline-block rounded-full bg-gray-200" />
                                )}
                              </TableCell>
                              <TableCell>
                                {item.ai_completion ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="h-5 w-5 inline-block rounded-full bg-gray-200" />
                                )}
                              </TableCell>
                              <TableCell>
                                {item.node_completion ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="h-5 w-5 inline-block rounded-full bg-gray-200" />
                                )}
                              </TableCell>
                              <TableCell>
                                {item.vue_completion ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <span className="h-5 w-5 inline-block rounded-full bg-gray-200" />
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(item.last_activity)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={`${item.completed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                                >
                                  {item.completed ? 'Completed' : 'In Progress'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default AutomatedFileManagementDashboard;