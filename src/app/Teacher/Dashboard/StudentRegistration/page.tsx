"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import StudentManagement from "@/app/Teacher/Dashboard/StudentRegistration/StudentRegistration"; // Adjust the import path as needed
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Decryption function
const decryptData = (encryptedText: string | undefined, secretKey: string | undefined): string => {
  try {
    if (!encryptedText) {
      console.log('No encrypted text provided');
      return '';
    }
    console.log('Attempting to decrypt:', encryptedText);
    
    const [ivBase64, encryptedBase64] = encryptedText.split('.');
    if (!ivBase64 || !encryptedBase64) {
      console.log('Invalid encrypted text format');
      return '';
    }
    
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secretKey).slice(0, 16);
    const encryptedBytes = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const decryptedBytes = encryptedBytes.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]);
    const result = new TextDecoder().decode(decryptedBytes);
    console.log('Decryption successful');
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};

// Secret key for decryption - should match the one used for encryption
const SECRET_KEY: string | undefined = process.env.NEXT_PUBLIC_SECRET_KEY; // Replace with your actual secret key

export default function StudentManagementPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<{
    teacherId: string;
    principalId: string;
    schoolId: string;
  } | null>(null);

  useEffect(() => {
    async function fetchTeacherData() {
      try {
        // Get the encrypted teacherId from cookies
        const encryptedTeacherId = Cookies.get('teacherId');
        
        if (!encryptedTeacherId) {
          console.log('No teacherId cookie found');
          router.push('/Teacher/login');
          return;
        }

        // Decrypt the teacherId
        const teacherId = decryptData(encryptedTeacherId, SECRET_KEY);
        
        if (!teacherId) {
          console.log('Failed to decrypt teacherId');
          router.push('/Teacher/login');
          return;
        }

        console.log('Decrypted teacherId:', teacherId);

        // Fetch additional data from Supabase using the teacherId
        // Use teacher_id instead of id if that's how your table is structured
        const { data, error } = await supabase
          .from('teachers')
          .select('id, teacher_id, principle_id, school_id')
          .eq('teacher_id', teacherId)
          .single();

        if (error) {
          console.error('Error fetching teacher data:', error);
          
          // Try alternative field if the first attempt failed
          const secondAttempt = await supabase
            .from('teachers')
            .select('id, teacher_id, principle_id, school_id')
            .eq('id', teacherId)
            .single();
            
          if (secondAttempt.error) {
            console.error('Second attempt failed:', secondAttempt.error);
            router.push('/Teacher/login');
            return;
          }
          
          setTeacherData({
            teacherId: teacherId,
            principalId: secondAttempt.data.principle_id,
            schoolId: secondAttempt.data.school_id,
          });
          return;
        }

        setTeacherData({
          teacherId: teacherId,
          principalId: data.principle_id,
          schoolId: data.school_id,
        });
      } catch (error) {
        console.error('Error in fetchTeacherData:', error);
        router.push('/Teacher/login');
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!teacherData) {
    return null; // Router will handle the redirection
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <StudentManagement 
        teacherId={teacherData.teacherId}
        principalId={teacherData.principalId}
        schoolId={teacherData.schoolId}
      />
    </div>
  );
}