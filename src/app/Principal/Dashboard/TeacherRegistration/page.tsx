"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { Eye, EyeOff } from 'lucide-react';
import Cookies from 'js-cookie';
import { useSearchParams } from 'next/navigation';

interface Teacher {
  id: string;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  qualification: string;
  experience: string;
  status: string;
  last_edited?: string;
  password?: string;
  can_edit_after?: string;
  is_final_submitted?: boolean;
  principle_id: string;
  school_id: string;
}

interface EditHistory {
  id: string;
  teacher_id: string;
  edited_by: string;
  edited_at: string;
  changes: {
    before: Partial<Teacher>;
    after: Partial<Teacher>;
  };
}

export default function TeacherRegistrationPage() {
  // State to hold the principal and school IDs
  const [principalId, setPrincipalId] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  // States for teacher management
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);
  const [selectedTeacherHistory, setSelectedTeacherHistory] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();

  // Get principal and school IDs on component mount
  useEffect(() => {
    async function fetchPrincipalData() {
      try {
        // First try to get from URL parameters (from login redirect)
        const urlPrincipalId = searchParams.get('principalId');
        const urlSchoolId = searchParams.get('schoolId');
        
        // Also try to get from cookies (if user refreshes page)
        const cookiePrincipalId = Cookies.get('principalId');
        const cookieUserId = Cookies.get('userId');
        
        let finalPrincipalId = urlPrincipalId || cookiePrincipalId;
        let finalSchoolId = urlSchoolId;
        
        // If we don't have school ID from URL, try to fetch it from database using principal ID
        if (finalPrincipalId && !finalSchoolId) {
          const { data, error } = await supabase
            .from('schools')
            .select('id')
            .eq('principle_id', finalPrincipalId)
            .single();
          
          if (!error && data) {
            finalSchoolId = data.id;
          }
        }
        
        // If we still don't have principal ID, try to get it from user ID
        if (!finalPrincipalId && cookieUserId) {
          const { data, error } = await supabase
            .from('principles')
            .select('id')
            .eq('user_id', cookieUserId)
            .single();
          
          if (!error && data) {
            finalPrincipalId = data.id;
            
            // Also get school ID
            const { data: schoolData, error: schoolError } = await supabase
              .from('schools')
              .select('id')
              .eq('principle_id', data.id)
              .single();
            
            if (!schoolError && schoolData) {
              finalSchoolId = schoolData.id;
            }
          }
        }
        
        if (finalPrincipalId && finalSchoolId) {
          setPrincipalId(finalPrincipalId);
          setSchoolId(finalSchoolId);
          
          // Store in cookies for future page refreshes
          Cookies.set('principalId', finalPrincipalId, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
          Cookies.set('schoolId', finalSchoolId, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });
        } else {
          console.log("Could not determine principal or school ID");
        }
      } catch (err) {
        console.log("Error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPrincipalData();
  }, [supabase, searchParams]);

  const generateTeacherId = () => {
    return `TCH${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const generatePassword = () => {
    return Math.random().toString(36).substr(2, 8);
  };

  const fetchTeachers = useCallback(async () => {
    if (!principalId || !schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', schoolId)
        .eq('principle_id', principalId);

      if (error) {
        alert("Error, Failed to fetch the Teachers");
        console.log("Fetch error:", error);
        return;
      }

      setTeachers(data || []);
      setIsFinalSubmitted(data?.[0]?.is_final_submitted || false);
    } catch (err) {
      console.log("Connection error:", err);
      alert("Network connection error. Please check your internet connection and try again.");
    }
  }, [principalId, schoolId, supabase]);

  useEffect(() => {
    if (principalId && schoolId) {
      fetchTeachers();
    }
  }, [fetchTeachers, principalId, schoolId]);

  const fetchTeacherHistory = useCallback(async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_edit_history')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('edited_at', { ascending: false });

      if (error) {
        alert("Failed to fetch edit history");
        return;
      }

      setEditHistory(data || []);
    } catch (err) {
      console.log("Connection error:", err);
      alert("Network connection error when fetching history.");
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedTeacherHistory) {
      fetchTeacherHistory(selectedTeacherHistory);
    }
  }, [selectedTeacherHistory, fetchTeacherHistory]);

  const recordEditHistory = async (teacherId: string, beforeData: Partial<Teacher>, afterData: Partial<Teacher>) => {
    const changes = {
      before: beforeData,
      after: afterData
    };

    const { error } = await supabase
      .from('teacher_edit_history')
      .insert({
        teacher_id: teacherId,
        edited_by: principalId,
        changes
      });

    if (error) {
      console.log('Failed to record edit history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = generatePassword();
    const teacherData = {
      id: editingTeacher?.id || uuidv4(),
      teacher_id: editingTeacher?.teacher_id || generateTeacherId(),
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      subject: formData.get('subject') as string,
      qualification: formData.get('qualification') as string,
      experience: formData.get('experience') as string,
      status: 'active',
      password: editingTeacher?.password || password,
      principle_id: principalId,
      school_id: schoolId,
      last_edited: new Date().toISOString(),
      is_final_submitted: false,
    };

    if (editingTeacher) {
      await recordEditHistory(
        editingTeacher.id,
        editingTeacher,
        teacherData
      );
    }

    const { error } = editingTeacher 
      ? await supabase.from('teachers').update(teacherData).eq('id', teacherData.id)
      : await supabase.from('teachers').insert(teacherData);

    if (error) {
      alert("Error, Failed to Save the Teacher");
      return;
    }

    alert(`Teacher ${editingTeacher ? 'updated' : 'added'} successfully${!editingTeacher ? `. Initial password: ${password}` : ''}`);

    setIsOpen(false);
    setEditingTeacher(null);
    fetchTeachers();
  };

  const handleRemove = async (id: string) => {
    const teacherToRemove = teachers.find(t => t.id === id);
    if (!teacherToRemove) return;

    await recordEditHistory(
      id,
      teacherToRemove,
      { status: 'deleted' }
    );

    const { error } = await supabase.from('teachers').delete().eq('id', id);
    
    if (error) {
      alert("Error, Failed to remove the teacher");
      return;
    }

    alert("Teacher removed successfully");
    fetchTeachers();
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        alert("No worksheet found in the Excel file");
        return;
      }

      const jsonData: Partial<Teacher>[] = [];
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      
      // Get headers from first row
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || '';
      });

      // Process data rows (starting from row 2)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const teacherData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            teacherData[header.toLowerCase()] = cell.value?.toString() || '';
          }
        });
        
        // Only add if we have at least a name
        if (teacherData.name) {
          jsonData.push(teacherData);
        }
      });

      if (jsonData.length === 0) {
        alert("No valid teacher data found in the Excel file");
        return;
      }

      const teachersToUpload = jsonData.map(teacher => ({
        id: uuidv4(),
        teacher_id: generateTeacherId(),
        password: generatePassword(),
        principle_id: principalId,
        school_id: schoolId,
        status: 'active',
        last_edited: new Date().toISOString(),
        is_final_submitted: false,
        ...teacher,
      }));

      const { error } = await supabase.from('teachers').insert(teachersToUpload);

      if (error) {
        alert("Failed to upload teachers");
        console.error("Upload error:", error);
        return;
      }

      // Record bulk upload in history
      for (const teacher of teachersToUpload) {
        await recordEditHistory(
          teacher.id,
          {},
          teacher
        );
      }

      alert(`${teachersToUpload.length} teachers uploaded successfully`);
      fetchTeachers();
    } catch (error) {
      console.error("Error processing Excel file:", error);
      alert("Error processing Excel file. Please check the file format and try again.");
    }
  };

  const handleFinalSubmit = async () => {
    const { error } = await supabase
      .from('teachers')
      .update({ is_final_submitted: true })
      .eq('school_id', schoolId)
      .eq('principle_id', principalId);

    if (error) {
      alert("Failed to submit finally");
      return;
    }

    // Record final submission in history
    for (const teacher of teachers) {
      await recordEditHistory(
        teacher.id,
        { is_final_submitted: false },
        { is_final_submitted: true }
      );
    }

    setIsFinalSubmitted(true);
    alert("Teachers list submitted successfully");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const togglePasswordVisibility = (teacherId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!principalId || !schoolId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold mb-4">Authorization Required</h2>
        <p>Principal or school data not found. Please log in again.</p>
        <Button onClick={() => window.location.href = '/Principal/login'} className="mt-4">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-[95%] ml-[2.5%] mt-[5vh]">
      <CardHeader>
        <CardTitle>Teacher Management</CardTitle>
        <div className="flex gap-4">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button disabled={isFinalSubmitted} onClick={()=>{setEditingTeacher(null)}}>Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-black">{editingTeacher ? 'Edit' : 'Add'} Teacher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-black" htmlFor="name">Name</Label>
                  <Input className="text-black"
                    id="name" 
                    name="name" 
                    defaultValue={editingTeacher?.name} 
                    required 
                  />
                </div>
                <div>
                  <Label className="text-black" htmlFor="email">Email</Label>
                  <Input className="text-black"
                    id="email" 
                    name="email" 
                    type="email" 
                    defaultValue={editingTeacher?.email} 
                    required 
                  />
                </div>
                <div>
                  <Label className="text-black" htmlFor="phone">Phone</Label>
                  <Input className="text-black"
                    id="phone" 
                    name="phone" 
                    defaultValue={editingTeacher?.phone} 
                    required 
                  />
                </div>
                <div>
                  <Label className="text-black" htmlFor="subject">Subject</Label>
                  <Input className="text-black"
                    id="subject" 
                    name="subject" 
                    defaultValue={editingTeacher?.subject} 
                    required 
                  />
                </div>
                <div>
                  <Label className="text-black" htmlFor="qualification">Qualification</Label>
                  <Input className="text-black"
                    id="qualification" 
                    name="qualification" 
                    defaultValue={editingTeacher?.qualification} 
                    required 
                  />
                </div>
                <div>
                  <Label className="text-black" htmlFor="experience">Experience</Label>
                  <Input className="text-black"
                    id="experience" 
                    name="experience" 
                    defaultValue={editingTeacher?.experience} 
                    required 
                  />
                </div>
                {editingTeacher && (
                  <div>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0"
                        onClick={() => togglePasswordVisibility(editingTeacher.id)}
                      >
                        {showPassword[editingTeacher.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                <Button type="submit">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleBulkUpload}
            disabled={isFinalSubmitted}
            className="max-w-xs"
          />
          <Button 
            onClick={handleFinalSubmit} 
            disabled={isFinalSubmitted || teachers.length === 0}
          >
            Final Submit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell>{teacher.teacher_id}</TableCell>
                <TableCell>{teacher.name}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>{teacher.phone}</TableCell>
                <TableCell>{teacher.subject}</TableCell>
                <TableCell>{teacher.qualification}</TableCell>
                <TableCell>{teacher.experience}</TableCell>
                <TableCell>
                  <div className="relative">
                    <Input
                      type={showPassword[teacher.id] ? "text" : "password"}
                      value={teacher.password}
                      readOnly
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0"
                      onClick={() => togglePasswordVisibility(teacher.id)}
                    >
                      {showPassword[teacher.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTeacher(teacher);
                        setIsOpen(true);
                      }}
                      disabled={isFinalSubmitted}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(teacher.id)}
                      disabled={isFinalSubmitted}
                    >
                      Remove
                    </Button>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeacherHistory(teacher.id)}
                        >
                          History
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Edit History - {teacher.name}</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 space-y-4">
                          {editHistory.map((history) => (
                            <div key={history.id} className="border-b pb-2">
                              <p className="text-sm text-gray-500">
                                {formatDate(history.edited_at)}
                              </p>
                              <p className="mt-1 text-sm">
                                Changes: {JSON.stringify(history.changes)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}