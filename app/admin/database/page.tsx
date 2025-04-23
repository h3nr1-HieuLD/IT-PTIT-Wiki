import MemberDatabaseTable from '@/components/database/MemberDatabaseTable';
import React from 'react';

export default function AdminDatabasePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Quản lý Database Thành viên</h1>

      {/* Original members table */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-bold mb-3">Members Table</h2>
        <MemberDatabaseTable />
      </div>
    </div>
  );
}
