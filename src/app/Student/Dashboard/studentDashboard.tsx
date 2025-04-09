"use client";
import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUpWideNarrow, AudioWaveform, Blocks, BookHeadphones, Component, FileStack, Gamepad2, PawPrint, Puzzle, Repeat2, Key, Lock, Bug, Shield, FileQuestion, FileSearch, FileCog, FileCode } from 'lucide-react';
import Cookies from 'js-cookie';
import { 
  BarChart,
  CheckCircle2,
  Clock,
  Users,
  Mouse,
  Keyboard,
  Code,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Type definitions
interface CourseStats {
  total: number;
  completed: number;
}

interface Stats {
  computerBasics: CourseStats;
  mouseKeyboard: CourseStats;
  internetSafety: CourseStats;
  fileSafety: CourseStats;
}

interface TeacherDashboardProps {
  teacherId: string;
}

interface EnvironmentVariables {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SECRET_KEY: string;
}

// Type guard for environment variables
const getEnvVars = (): EnvironmentVariables => {
  const vars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SECRET_KEY: process.env.NEXT_PUBLIC_SECRET_KEY,
  };

  if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_ANON_KEY || !vars.NEXT_PUBLIC_SECRET_KEY) {
    throw new Error('Missing required environment variables');
  }

  return vars as EnvironmentVariables;
};

const envVars = getEnvVars();
const supabase: SupabaseClient = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface ModuleInput{
  total:number;
  completed: number;
  name:string;
  icon?: React.ReactNode;  // Add icon type here
  submodule?:number;
}
interface SubModule {
  name: string;
  icon: React.ReactNode;
  link: string;
}

interface GenericModuleGridProps {
  modules: SubModule[];
  onModuleSelect: (link: string) => void;
}

const subModules: SubModule[][] = [
  // Index 0: Mouse Keyboard Quest Submodules
  [
    {
      name: "Mouse Movement",
      icon: <Mouse className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Mouse_Keyboard_Quest/Mouse_Movement"
    },
    {
      name: "Keyboard",
      icon: <Keyboard className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Mouse_Keyboard_Quest/Keyboard"
    },
    {
      name: "Dev Detective",
      icon: <Code className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Mouse_Keyboard_Quest/Dev_Detective"
    }
  ],
  // Index 1: Internet Safety Submodules (flattened)
  [
    {
      name: "Password",
      icon: <Key className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Internet_Safety/Rookie_Agent/passwords"
    },
    {
      name: "Encryption",
      icon: <Lock className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Internet_Safety/Rookie_Agent/Encryption"
    },
    {
      name: "Antivirus",
      icon: <Bug className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Internet_Safety/Field_Samurai/Antivirus"
    },
    {
      name: "Firewall",
      icon: <Shield className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Internet_Safety/Field_Samurai/Firewall"
    },
    {
      name: "Phishing",
      icon: <FileQuestion className="w-full" />,
      link: "/Student/Modules/Computer_Basics/Internet_Safety/Field_Samurai/Phishing"
    }
  ],
  // Index 2: File Safety Submodules
  [
    {
      name: "File Operations",
      icon: <FileSearch className="w-full" />,
      link: "/Student/Modules/Computer_Basics/File_Management/File_Operations"
    },
    {
      name: "File Management",
      icon: <FileCog className="w-full" />,
      link: "/Student/Modules/Computer_Basics/File_Management/File_Management/File_Management"
    },
    {
      name: "Automated File Management",
      icon: <FileCode className="w-full" />,
      link: "/Student/Modules/Computer_Basics/File_Management/File_Management/Automated_File_Operations"
    }
  ]
];

const GenericModuleGrid = ({ 
  modules, 
  onModuleSelect
}: GenericModuleGridProps) => {
  return (
    <div className={`w-full max-w-4xl p-6`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module, index) => (
          <Card 
            key={index}
            className="cursor-pointer bg-[black] text-[white] transition-all duration-100 hover:shadow-lg hover:scale-105 transform"
            onClick={() => onModuleSelect(module.link)}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-4">
                {module.icon}
              </div>
              <span className='text-sm mt-[2vh]'>{module.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};


const Module: React.FC<ModuleInput>=({total,completed,name,icon, submodule})=>{
  const router = useRouter();
  
  
  return (<Card>
              <CardHeader> 
                <div className="flex items-center space-x-2">
                  {icon}
                  <CardTitle>{name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 w-[90%] ml-[5%]">
                  <div className="flex justify-between text-sm">
                    <span>Total Students</span>
                    <span>{total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span className="text-green-500">{completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>In Progress</span>
                    <span className="text-orange-500">
                      {total - completed}
                    </span>
                  </div>
                </div>
                <GenericModuleGrid modules={subModules[submodule || 0]} onModuleSelect={(link) => {router.push(link)}} />
                {/* <Button variant="default" className='w-[100%] mt-[2vh]'>{name}</Button> */}
              </CardContent>
            </Card>);
};

export default function TeacherDash(){
  const secretKey = envVars.NEXT_PUBLIC_SECRET_KEY;
  const [teacherId, setTeacherId] = useState<string>('');

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

  useEffect(() => {
    const userIdCookie = Cookies.get('teacherId');
    if (userIdCookie) {
      const decryptedId = decryptData(userIdCookie);
      if (decryptedId) {
        setTeacherId(decryptedId);
      }
    }
  }, []); // Remove dependency on teacherId to prevent infinite loop

  return <TeacherDashboard teacherId={teacherId} />;
};


const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacherId }) => {
  const [stats, setStats] = useState<Stats>({
    computerBasics: { total: 0, completed: 0 },
    mouseKeyboard: { total: 0, completed: 0 },
    internetSafety: { total: 0, completed: 0 },
    fileSafety: { total: 0, completed: 0 }
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      if (!teacherId) {
        setLoading(false);
        return;
      }

      try {
        // Try to load from localStorage first
        const cachedStats = localStorage.getItem(`teacherStats_${teacherId}`);
        if (cachedStats) {
          setStats(JSON.parse(cachedStats));
          setLoading(false);
        }

        // Get all students for this teacher
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('teacher_id', teacherId);

        if (studentError) throw studentError;
        if (!students?.length) {
          setLoading(false);
          return;
        }

        const studentIds = students.map(s => s.id);

        // Fetch all stats in parallel
        const [
          { data: computerBasics },
          { data: mouseKeyboard },
          { data: internetSafety },
          { data: fileSafety }
        ] = await Promise.all([
          supabase.from('computer_basics').select('completed').in('student_id', studentIds),
          supabase.from('mouse_keyboard_quest').select('completed').in('student_id', studentIds),
          supabase.from('internet_safety').select('completed').in('student_id', studentIds),
          supabase.from('file_safety').select('completed').in('student_id', studentIds)
        ]);

        const newStats: Stats = {
          computerBasics: {
            total: computerBasics?.length || 0,
            completed: computerBasics?.filter(c => c.completed).length || 0
          },
          mouseKeyboard: {
            total: mouseKeyboard?.length || 0,
            completed: mouseKeyboard?.filter(m => m.completed).length || 0
          },
          internetSafety: {
            total: internetSafety?.length || 0,
            completed: internetSafety?.filter(i => i.completed).length || 0
          },
          fileSafety: {
            total: fileSafety?.length || 0,
            completed: fileSafety?.filter(f => f.completed).length || 0
          }
        };

        setStats(newStats);
        // Cache the stats in localStorage
        localStorage.setItem(`teacherStats_${teacherId}`, JSON.stringify(newStats));
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Try to load from localStorage as fallback
        const cachedStats = localStorage.getItem(`teacherStats_${teacherId}`);
        if (cachedStats) {
          setStats(JSON.parse(cachedStats));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [teacherId]); // Only depend on teacherId

  const calculatePercentage = (completed: number, total: number): number => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-tighter">Course Dashboard</h1>
        <p className="text-gray-500">Monitor student progress across all courses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-8xl font-bold text-center">{stats.computerBasics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed All Courses</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-8xl font-bold text-center">
              {stats.computerBasics.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-8xl font-bold text-center">
              {stats.computerBasics.total - stats.computerBasics.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress [In Percent]</CardTitle>
            <BarChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-8xl font-bold text-center">
              {calculatePercentage(stats.computerBasics.completed, stats.computerBasics.total)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Course Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <Mouse className="mr-2 h-4 w-4" />
                      Mouse & Keyboard
                    </span>
                    <span>{calculatePercentage(stats.mouseKeyboard.completed, stats.mouseKeyboard.total)}%</span>
                  </div>
                  <Progress value={calculatePercentage(stats.mouseKeyboard.completed, stats.mouseKeyboard.total)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Internet Safety
                    </span>
                    <span>{calculatePercentage(stats.internetSafety.completed, stats.internetSafety.total)}%</span>
                  </div>
                  <Progress value={calculatePercentage(stats.internetSafety.completed, stats.internetSafety.total)} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      File Safety
                    </span>
                    <span>{calculatePercentage(stats.fileSafety.completed, stats.fileSafety.total)}%</span>
                  </div>
                  <Progress value={calculatePercentage(stats.fileSafety.completed, stats.fileSafety.total)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.computerBasics.total - stats.computerBasics.completed > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {stats.computerBasics.total - stats.computerBasics.completed} {"students haven't completed the basic course"}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {calculatePercentage(stats.internetSafety.completed, stats.internetSafety.total) < 50 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Less than 50% completion rate in Internet Safety
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <h1 className='text-4xl font-bold mb-4 tracking-tighter'>Digital Explorer</h1>
          <div className="w-[90%] ml-[5%] mt-[3vh]">
          <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Computer Basics</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Mouse & Keyboard"} icon={<Mouse className="h-6 w-6"/>} submodule={0}/>
            <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Internet Safety"} icon={<Keyboard className="h-6 w-6"/> } submodule={1}/>
            <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"File Safety"} icon={<FileStack className="h-6 w-6"/>} submodule={2}/>
          </div>
          
          <div className='mt-4'></div>
          <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Logic Games</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Sequencing Challenege"} icon={<ArrowUpWideNarrow className="h-6 w-6"/>}/>
            <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Puzzle Solving"} icon={<Puzzle className="h-6 w-6"/>}/>
            <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Pattern Recognition"} icon={<Component className="h-6 w-6"/>}/>
          </div>
          </div>

          <h1 className='text-4xl font-bold mb-4 tracking-tighter mt-8'>Block Commander</h1>
          <div className="w-[90%] ml-[5%] mt-[3vh]">
            {/* Visual Programming Basics Section */}
            <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Visual Programming Basics</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Creating Sequence"} icon={<AudioWaveform className="h-6 w-6"/>}/>
                    <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Simple Loops"} icon={<Repeat2 className="h-6 w-6"/>}/>
                    <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Understanding Blocks"} icon={<Blocks className="h-6 w-6"/>}/>
            </div>

          {/* Creative Challenges Section */}
          <div className='mt-4'></div>
          <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Creative Challenges</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Character Movement"} icon={<Gamepad2 className="h-6 w-6"/>}/>
                  <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Basic Animations"} icon={<PawPrint className="h-6 w-6"/>}/>
                  <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Animated Stories"} icon={<BookHeadphones className="h-6 w-6"/>}/>
          </div>
        </div>

        <h1 className='text-4xl font-bold mb-4 tracking-tighter mt-6'>Algorithm Adventure</h1>
          <div className="w-[90%] ml-[5%] mt-[3vh]">
          <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Basic Algorithm</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Decision Making"} icon={<Gamepad2 className="h-6 w-6"/>}/>
            <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Simple Repetation"} icon={<PawPrint className="h-6 w-6"/>}/>
            <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Step by Step Thinking"} icon={<BookHeadphones className="h-6 w-6"/>}/>
          </div>
          
          <div className='mt-4'></div>
          <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Problem Solving</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Maze Navigation"} icon={<Gamepad2 className="h-6 w-6"/>}/>
            <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Simple Games"} icon={<PawPrint className="h-6 w-6"/>}/>
            <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Pattern Creation"} icon={<BookHeadphones className="h-6 w-6"/>}/>
          </div>
          </div>

          <h1 className='text-4xl font-bold mb-4 tracking-tighter mt-8'>Creative Coder</h1>
  <div className="w-[90%] ml-[5%] mt-[3vh]">
    {/* Visual Programming Basics Section */}
    <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Project Based</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Basic Games"} icon={<Gamepad2 className="h-6 w-6"/>}/>
            <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Interactive Stories"} icon={<PawPrint className="h-6 w-6"/>}/>
            <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Simple Animation"} icon={<BookHeadphones className="h-6 w-6"/>}/>
    </div>

    {/* Creative Challenges Section */}
    <div className='mt-4'></div>
    <h1 className='text-2xl font-bold mb-4 tracking-tighter'>Team Challenges</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module total={stats.mouseKeyboard.total} completed={stats.mouseKeyboard.completed} name={"Pair Programming"} icon={<Gamepad2 className="h-6 w-6"/>}/>
            <Module total={stats.internetSafety.total} completed={stats.internetSafety.completed} name={"Show and Tell"} icon={<PawPrint className="h-6 w-6"/>}/>
            <Module total={stats.fileSafety.total} completed={stats.fileSafety.completed} name={"Code Review"} icon={<BookHeadphones className="h-6 w-6"/>}/>
    </div>
  </div>

        </TabsContent>
      </Tabs>
    </div>
  );
};
