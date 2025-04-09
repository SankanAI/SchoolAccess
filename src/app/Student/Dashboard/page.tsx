import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentPagination from "./StudentList";
import TeacherDash from "./studentDashboard";
import { Users, LayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <div className="p-6 bg-slate-50">
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="students" className="space-y-4">
          <StudentPagination />
        </TabsContent>
        
        <TabsContent value="dashboard" className="space-y-4">
          <TeacherDash />
        </TabsContent>
      </Tabs>
    </div>
  );
}