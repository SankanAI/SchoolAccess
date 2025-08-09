"use client";
import { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';

interface StudentManagementProps {
  principalId: string;
  schoolId: string;
  teacherId: string;
}

interface Student {
  id: string;
  student_id: string;
  name: string;
  roll_no: string;
  class: string;
  section: string;
  parent_email: string;
  parent_phone: string;
  password: string;
  status: string;
  principle_id: string;
  school_id: string;
  teacher_id: string;
  is_final_submitted: boolean;
}

interface StudentExcelRow {
  'Name': string;
  'Roll No': string;
  'Class': string;
  'Section': string;
  'Parent Email': string;
  'Parent Phone': string;
}

export default function StudentManagement({ principalId, schoolId, teacherId }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const generateStudentId = () => {
    return `STU${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const generatePassword = () => {
    // Generate a secure password with 8 characters: 4 letters + 4 numbers
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()';
    const numbers = '0123456789';
    
    let password = '';
    
    // Add 4 random letters
    for (let i = 0; i < 4; i++) {
      password += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Add 4 random numbers
    for (let i = 0; i < 4; i++) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    // Shuffle the password to mix letters and numbers
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const ensureUniquePassword = async (password: string): Promise<string> => {
    let uniquePassword = password;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('password', uniquePassword)
        .single();

      if (!existingStudent) {
        return uniquePassword;
      }

      uniquePassword = generatePassword();
      attempts++;
    }

    throw new Error('Unable to generate unique password after multiple attempts');
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .eq('principle_id', principalId)
        .eq('teacher_id', teacherId);

      if (error) {
        console.log("Error fetching students:", error);
        alert(`Error fetching students: ${error.message}`);
        return;
      }

      setStudents(data || []);
      setIsFinalSubmitted(data?.[0]?.is_final_submitted || false);
    } catch (err) {
      console.log("Unexpected error:", err);
      alert("An unexpected error occurred while fetching students");
    }
  };

  const recordEditHistory = async (studentId: string, beforeData: Partial<Student>, afterData: Partial<Student>) => {
    try {
      const { error } = await supabase
        .from('student_edit_history')
        .insert({
          student_id: studentId,
          edited_by: principalId,
          changes: {
            before: beforeData,
            after: afterData
          }
        });

      if (error) {
        console.log('Failed to record edit history:', error);
      }
    } catch (err) {
      console.log('Unexpected error recording edit history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Validate required fields
      const name = formData.get('name') as string;
      const className = formData.get('class') as string;
      const parentEmail = formData.get('parent_email') as string;
      
      if (!name?.trim() || !className?.trim() || !parentEmail?.trim()) {
        alert("Please fill in all required fields (Name, Class, Parent Email)");
        return;
      }

      // Check for duplicate student_id when creating new student
      let studentId = editingStudent?.student_id || generateStudentId();
      
      if (!editingStudent) {
        // For new students, ensure unique student_id
        let attempts = 0;
        while (attempts < 10) {
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('student_id', studentId)
            .single();
          
          if (!existingStudent) break;
          
          studentId = generateStudentId();
          attempts++;
        }
      }

      // Generate unique password for new students or keep existing for edits
      let password = editingStudent?.password;
      if (!editingStudent) {
        const newPassword = generatePassword();
        password = await ensureUniquePassword(newPassword);
      }

      const studentData = {
        student_id: studentId,
        name: name.trim(),
        roll_no: (formData.get('roll_no') as string)?.trim() || '',
        class: className.trim(),
        section: (formData.get('section') as string)?.trim() || '',
        parent_email: parentEmail.trim(),
        parent_phone: (formData.get('parent_phone') as string)?.trim() || '',
        password: password,
        status: 'active',
        principle_id: principalId,
        school_id: schoolId,
        teacher_id: teacherId,
        is_final_submitted: false,
      };

      let result;
      
      if (editingStudent) {
        // Record edit history before updating
        await recordEditHistory(
          editingStudent.id,
          editingStudent,
          { ...studentData, id: editingStudent.id }
        );
        
        // Update existing student (excluding password from update)
        const { password: _, ...updateData } = studentData;
        result = await supabase
          .from('students')
          .update(updateData)
          .eq('id', editingStudent.id)
          .select();
      } else {
        // Insert new student
        result = await supabase
          .from('students')
          .insert({ ...studentData, id: uuidv4() })
          .select();
      }

      if (result.error) {
        console.log("Database error:", result.error);
        
        // Provide more specific error messages
        if (result.error.code === '23505') {
          alert("A student with this ID or password already exists. Please try again.");
        } else if (result.error.code === '23502') {
          alert("Missing required field. Please check all required fields are filled.");
        } else if (result.error.code === '23503') {
          alert("Invalid reference to principal, school, or teacher. Please check your permissions.");
        } else {
          alert(`Failed to save student: ${result.error.message}`);
        }
        return;
      }

      setIsOpen(false);
      setEditingStudent(null);
      await fetchStudents();
      
      if (!editingStudent && password) {
        alert(`Student added successfully!\nGenerated Password: ${password}\nPlease save this password securely.`);
      } else {
        alert("Student updated successfully!");
      }
      
    } catch (err) {
      console.log("Unexpected error:", err);
      if (err instanceof Error && err.message.includes('unique password')) {
        alert("Unable to generate a unique password. Please try again.");
      } else {
        alert("An unexpected error occurred while saving the student");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Create ExcelJS workbook and load data
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // Get first worksheet
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        alert("No worksheet found in the Excel file");
        return;
      }

      // Extract data from worksheet
      const jsonData: any[] = [];
      const headers: string[] = [];
      
      // Get headers from the first row
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || '';
      });

      // Process data rows (starting from row 2)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value?.toString() || '';
          }
        });
        
        // Only add if we have at least a name
        if (rowData['Name']) {
          jsonData.push(rowData);
        }
      });

      if (!jsonData || jsonData.length === 0) {
        alert("No valid data found in the Excel file");
        return;
      }

      // Validate and prepare data
      const studentsToUpload = [];
      const errors = [];
      const passwordList: string[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        if (!row['Name']?.trim() || !row['Class']?.trim() || !row['Parent Email']?.trim()) {
          errors.push(`Row ${i + 2}: Missing required fields (Name, Class, or Parent Email)`);
          continue;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row['Parent Email'].trim())) {
          errors.push(`Row ${i + 2}: Invalid email format for Parent Email`);
          continue;
        }

        // Generate unique password for each student
        try {
          const newPassword = generatePassword();
          const uniquePassword = await ensureUniquePassword(newPassword);
          
          const studentData = {
            id: uuidv4(),
            student_id: generateStudentId(),
            name: row['Name'].trim(),
            roll_no: row['Roll No']?.trim() || '',
            class: row['Class'].trim(),
            section: row['Section']?.trim() || '',
            parent_email: row['Parent Email'].trim(),
            parent_phone: row['Parent Phone']?.trim() || '',
            password: uniquePassword,
            status: 'active',
            principle_id: principalId,
            school_id: schoolId,
            teacher_id: teacherId,
            is_final_submitted: false,
          };

          studentsToUpload.push(studentData);
          passwordList.push(`${row['Name'].trim()}: ${uniquePassword}`);
        } catch (passwordError) {
          errors.push(`Row ${i + 2}: Failed to generate unique password`);
        }
      }

      if (errors.length > 0) {
        alert(`Found ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n... and more' : ''}`);
        if (studentsToUpload.length === 0) return;
      }

      // Insert students in batches to avoid timeout
      const batchSize = 100;
      let successCount = 0;
      
      for (let i = 0; i < studentsToUpload.length; i += batchSize) {
        const batch = studentsToUpload.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('students')
          .insert(batch);

        if (error) {
          console.log("Bulk upload error:", error);
          alert(`Failed to upload batch starting at row ${i + 2}: ${error.message}`);
          break;
        }
        
        successCount += batch.length;
      }

      if (successCount > 0) {
        const passwordInfo = passwordList.slice(0, successCount).join('\n');
        alert(`Successfully uploaded ${successCount} students!\n\nGenerated Passwords:\n${passwordInfo}\n\nPlease save these passwords securely.`);
        await fetchStudents();
      }
      
    } catch (err) {
      console.log("Error processing file:", err);
      alert("Error processing the Excel file. Please check the format and try again.");
    } finally {
      setIsLoading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleFinalSubmit = async () => {
    if (students.length === 0) {
      alert("No students to submit");
      return;
    }
    
    const confirmed = confirm("Are you sure you want to finalize the student list? This action cannot be undone.");
    if (!confirmed) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_final_submitted: true })
        .eq('school_id', schoolId)
        .eq('principle_id', principalId)
        .eq('teacher_id', teacherId);

      if (error) {
        console.log("Final submit error:", error);
        alert(`Failed to submit finally: ${error.message}`);
        return;
      }

      setIsFinalSubmitted(true);
      alert("Students list submitted successfully!");
      
    } catch (err) {
      console.log("Unexpected error:", err);
      alert("An unexpected error occurred during final submission");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmed = confirm(`Are you sure you want to remove ${student.name}?`);
    if (!confirmed) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);
        
      if (error) {
        console.log("Delete error:", error);
        alert(`Failed to remove student: ${error.message}`);
        return;
      }
      
      await fetchStudents();
      alert("Student removed successfully!");
      
    } catch (err) {
      console.log("Unexpected error:", err);
      alert("An unexpected error occurred while removing the student");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePassword = async (student: Student) => {
    const confirmed = confirm(`Are you sure you want to regenerate password for ${student.name}?`);
    if (!confirmed) return;
    
    setIsLoading(true);
    
    try {
      const newPassword = generatePassword();
      const uniquePassword = await ensureUniquePassword(newPassword);
      
      const { error } = await supabase
        .from('students')
        .update({ password: uniquePassword })
        .eq('id', student.id);
        
      if (error) {
        console.log("Password regeneration error:", error);
        alert(`Failed to regenerate password: ${error.message}`);
        return;
      }
      
      await fetchStudents();
      alert(`New password generated for ${student.name}: ${uniquePassword}\nPlease save this password securely.`);
      
    } catch (err) {
      console.log("Unexpected error:", err);
      alert("An unexpected error occurred while regenerating the password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[95%] ml-[2.5%] mt-[5vh] bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="pb-[3vh] text-white">Student Management</CardTitle>
        <div className="flex gap-4">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={isFinalSubmitted || isLoading} 
                className="bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Add Student"}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">{editingStudent ? 'Edit' : 'Add'} Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300">Name *</label>
                    <Input 
                      name="name" 
                      defaultValue={editingStudent?.name} 
                      required 
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="text-gray-300">Roll No</label>
                    <Input 
                      name="roll_no" 
                      defaultValue={editingStudent?.roll_no} 
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="text-gray-300">Class *</label>
                    <Input 
                      name="class" 
                      defaultValue={editingStudent?.class} 
                      required 
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="text-gray-300">Section</label>
                    <Input 
                      name="section" 
                      defaultValue={editingStudent?.section} 
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="text-gray-300">Parent Email *</label>
                    <Input 
                      name="parent_email" 
                      type="email" 
                      defaultValue={editingStudent?.parent_email} 
                      required 
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="text-gray-300">Parent Phone</label>
                    <Input 
                      name="parent_phone" 
                      defaultValue={editingStudent?.parent_phone} 
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                    />
                  </div>
                </div>
                {editingStudent && (
                  <div className="bg-gray-800 p-3 rounded">
                    <label className="text-gray-300">Current Password: </label>
                    <span className="text-yellow-400 font-mono">{editingStudent.password}</span>
                  </div>
                )}
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleBulkUpload}
            disabled={isFinalSubmitted || isLoading}
            className="bg-gray-800 border-gray-700 text-white file:bg-gray-700 file:text-white file:border-gray-600 disabled:opacity-50"
          />
          <Button 
            onClick={handleFinalSubmit}
            disabled={isFinalSubmitted || students.length === 0 || isLoading}
            className="bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-50"
          >
            {isLoading ? "Submitting..." : "Final Submit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-gray-800">
            <TableRow>
              <TableHead className="text-gray-300">Student ID</TableHead>
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Class</TableHead>
              <TableHead className="text-gray-300">Section</TableHead>
              <TableHead className="text-gray-300">Roll No</TableHead>
              <TableHead className="text-gray-300">Parent Email</TableHead>
              <TableHead className="text-gray-300">Parent Phone</TableHead>
              <TableHead className="text-gray-300">Password</TableHead>
              <TableHead className="text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} className="border-gray-800 hover:bg-gray-800">
                <TableCell className="text-gray-300">{student.student_id}</TableCell>
                <TableCell className="text-gray-300">{student.name}</TableCell>
                <TableCell className="text-gray-300">{student.class}</TableCell>
                <TableCell className="text-gray-300">{student.section}</TableCell>
                <TableCell className="text-gray-300">{student.roll_no}</TableCell>
                <TableCell className="text-gray-300">{student.parent_email}</TableCell>
                <TableCell className="text-gray-300">{student.parent_phone}</TableCell>
                <TableCell className="text-yellow-400 font-mono">{student.password}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingStudent(student);
                        setIsOpen(true);
                      }}
                      disabled={isFinalSubmitted || isLoading}
                      className="border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegeneratePassword(student)}
                      disabled={isFinalSubmitted || isLoading}
                      className="border-yellow-700 text-yellow-400 hover:bg-yellow-900 disabled:opacity-50"
                    >
                      Reset Pwd
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStudent(student)}
                      disabled={isFinalSubmitted || isLoading}
                      className="bg-red-900 hover:bg-red-800 text-white disabled:opacity-50"
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {students.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No students found. Add students using the form above or upload an Excel file.
          </div>
        )}
      </CardContent>
    </Card>
  );
}