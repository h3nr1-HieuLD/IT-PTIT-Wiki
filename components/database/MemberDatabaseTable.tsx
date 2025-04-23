'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Mail, School, UserRound, Calendar, Phone, Facebook, Users } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Papa from 'papaparse';

// Use the full members schema from supabase
type Member = {
  id: string;
  fullname: string;
  email: string;
  team: number;
  class_name: string;
  student_code: string;
  batch: number;
  dob: string;
  gender: number;
  facebook_link: string | null;
  main_pic: string;
  phone_number: string | null;
};

export default function MemberDatabaseTable() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Member>>({});
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addData, setAddData] = useState<Partial<Member>>({});
  const [removeConfirm, setRemoveConfirm] = useState('');
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper: Parse gender from CSV
  const parseGender = (gender: string) => {
    if (gender.toLowerCase().includes('nam')) return 1;
    if (gender.toLowerCase().includes('nữ') || gender.toLowerCase().includes('nu')) return 0;
    return 2;
  };

  // Helper: Parse team from CSV (e.g., 'Team 1' -> 1)
  const parseTeam = (team: string) => {
    const match = team.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Helper: Parse batch (e.g., 'D16' -> 16)
  const parseBatch = (batch: string) => {
    const match = batch.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Helper: Parse date from CSV (dd/MM/yyyy to yyyy-MM-dd)
  const parseDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Accepts dd/MM/yyyy or d/M/yyyy
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Pad day/month if needed
      const d = day.padStart(2, '0');
      const m = month.padStart(2, '0');
      return `${year}-${m}-${d}`;
    }
    return dateStr;
  };

  // CSV Import Handler
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        console.log('CSV Parse Results:', results); // Debug: log full results
        const rows = results.data;
        let added = 0;
        for (const row of rows) {
          console.log('Processing row:', row); // Debug: log each row
          const student_code = row['Mã sinh viên']?.trim();
          const fullname = row['Họ và tên']?.trim();
          if (!student_code || !fullname) continue;
          // Check if already exists by both fullname and student_code
          if (members.some(m => m.student_code === student_code && m.fullname === fullname)) continue;
          // Build full member object
          const newMember: Partial<Member> = {
            fullname,
            email: row['Email']?.trim() || '',
            team: parseTeam(row['Thành viên thuộc team'] || ''),
            class_name: row['Mã lớp chính quy']?.trim() || '',
            student_code,
            batch: parseBatch(row['Khóa'] || ''),
            dob: parseDate(row['Ngày sinh']?.trim() || ''),
            gender: parseGender(row['Giới tính'] || ''),
            facebook_link: row['Link facebook']?.trim() || null,
            main_pic: row['1 bức ảnh đẹp nhất của bạn (Rõ mặt để mọi người có thể nhận ra nhé)']?.trim() || '',
            phone_number: row['Số điện thoại']?.trim() || null,
          };
          console.log('Built newMember:', newMember); // Debug: log built member
          // Only add if all required fields are present
          if (
            newMember.fullname && newMember.email && newMember.team && newMember.class_name &&
            newMember.student_code && newMember.batch && newMember.dob && newMember.gender !== undefined && newMember.main_pic
          ) {
            try {
              const response = await fetch('/api/admin/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMember),
              });
              if (response.ok) {
                const created = await response.json();
                setMembers(prev => [created, ...prev]);
                setFilteredMembers(prev => [created, ...prev]);
                added++;
              }
            } catch (err) {
              console.error('Error adding member:', err);
            }
          } else {
            console.warn('Skipped incomplete member:', newMember);
          }
        }
        alert(`Đã thêm ${added} thành viên mới từ file CSV.`);
      },
    });
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/admin/members');
        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          setError('API did not return valid JSON.');
          setLoading(false);
          return;
        }
        if (!response.ok) {
          if (data && data.error) {
            setError('Không thể tải dữ liệu thành viên.');
          } else {
            setError('Không thể tải dữ liệu thành viên.');
          }
          setLoading(false);
          return;
        }
        if (Array.isArray(data) && data.length > 0) {
          setMembers(data as Member[]);
          setFilteredMembers(data as Member[]);
        } else if (Array.isArray(data) && data.length === 0) {
          setError('Không có thành viên nào trong cơ sở dữ liệu.');
        } else if (data && data.error) {
          setError('Không thể tải dữ liệu thành viên.');
        } else {
          setError('Không thể tải dữ liệu thành viên.');
        }
      } catch (error) {
        setError('Không thể tải dữ liệu thành viên.');
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const results = members.filter(member =>
      member.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMembers(results);
  }, [searchTerm, members]);

  const handleEdit = (member: Member) => {
    setEditingId(member.id);
    setEditData(member);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    if (!editingId) return;

    try {
      console.log('MemberDatabaseTable: Updating member with ID:', editingId);
      const response = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: editingId, ...editData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update member: ${response.status} ${response.statusText}`);
      }

      const updatedData = await response.json();
      console.log('MemberDatabaseTable: Member updated successfully', updatedData);

      // Update the local state with the updated member
      setMembers(members.map(m => m.id === editingId ? { ...m, ...editData } as Member : m));
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error('MemberDatabaseTable: Error updating member:', error);
      // You could add error handling UI here
    }
  };

  const handleRowClick = (member: Member) => {
    setSelectedMember(member);
  };

  // Helper function to get gender text
  const getGenderText = (gender: number) => {
    switch(gender) {
      case 1: return 'Nam';
      case 0: return 'Nữ';
      default: return 'Khác';
    }
  };

  // Helper function to get initials from fullname
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Add member handler
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddData({ ...addData, [e.target.name]: e.target.value });
  };
  const handleAddSave = async () => {
    // Basic validation (add more as needed)
    if (!addData.fullname || !addData.email || !addData.student_code || !addData.class_name) return;
    try {
      const response = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addData),
      });
      if (!response.ok) throw new Error('Failed to add member');
      const newMember = await response.json();
      setMembers([newMember, ...members]);
      setFilteredMembers([newMember, ...filteredMembers]);
      setAddDialogOpen(false);
      setAddData({});
    } catch (err) {
      // handle error
    }
  };

  // Remove member handler
  const handleRemoveMember = async () => {
    if (!selectedMember || removeConfirm !== 'REMOVE') {
      setRemoveError('Bạn phải nhập đúng mã xác nhận (REMOVE) để xoá.');
      return;
    }
    setRemoving(true);
    setRemoveError(null);
    console.log('Attempting to remove member:', selectedMember.id, selectedMember.fullname);
    try {
      const response = await fetch(`/api/admin/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedMember.id }),
      });
      console.log('Delete response status:', response.status);
      if (!response.ok) {
        const errText = await response.text();
        console.error('Failed to remove member:', errText);
        throw new Error('Failed to remove member');
      }
      setMembers(members.filter(m => m.id !== selectedMember.id));
      setFilteredMembers(filteredMembers.filter(m => m.id !== selectedMember.id));
      setSelectedMember(null);
      setRemoveConfirm('');
      console.log('Member removed successfully');
    } catch (err) {
      setRemoveError('Không thể xoá thành viên.');
      console.error('Error in handleRemoveMember:', err);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      {/* Top bar with Add button, import CSV, and search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Badge variant="outline" className="ml-2">
            {filteredMembers.length} thành viên
          </Badge>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setAddDialogOpen(true)} variant="default">
            + Thêm thành viên
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Nhập từ CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVImport}
          />
        </div>
      </div>

      {/* Loading and error states */}
      {loading && (
        <div className="flex justify-center items-center p-8 text-blue-600">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Đang tải dữ liệu...
        </div>
      )}

      {error && !loading && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          <p>{error}</p>
          <p className="mt-2">Vui lòng kiểm tra kết nối cơ sở dữ liệu hoặc tải lại trang.</p>
        </div>
      )}

      {/* Main table with improved design */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md bg-white dark:bg-[#18181b]">
          <Table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <TableCaption>Danh sách thành viên ITPTIT-Wiki</TableCaption>
            <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-zinc-900">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mã SV</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Không tìm thấy thành viên nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow 
                    key={member.id} 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    onClick={() => handleRowClick(member)}
                  >
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        {member.main_pic ? (
                          <AvatarImage src={member.main_pic} alt={member.fullname} />
                        ) : null}
                        <AvatarFallback>{getInitials(member.fullname)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{member.fullname}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.student_code}</TableCell>
                    <TableCell>{member.class_name}</TableCell>
                    <TableCell className="text-right">
                      <Button onClick={(e) => { e.stopPropagation(); handleRowClick(member); }} size="sm" variant="outline">
                        Xem / Sửa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thêm thành viên mới</DialogTitle>
            <DialogDescription>Nhập thông tin thành viên mới.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input name="fullname" placeholder="Họ tên" value={addData.fullname || ''} onChange={handleAddChange} />
            <Input name="email" placeholder="Email" value={addData.email || ''} onChange={handleAddChange} />
            <Input name="student_code" placeholder="Mã SV" value={addData.student_code || ''} onChange={handleAddChange} />
            <Input name="class_name" placeholder="Lớp" value={addData.class_name || ''} onChange={handleAddChange} />
            {/* Add more fields as needed */}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleAddSave} variant="default">Lưu</Button>
            <Button onClick={() => setAddDialogOpen(false)} variant="outline">Huỷ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member detail dialog with edit and remove */}
      <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Avatar className="h-8 w-8 inline-block">
                    {selectedMember.main_pic ? (
                      <AvatarImage src={selectedMember.main_pic} alt={selectedMember.fullname} />
                    ) : null}
                    <AvatarFallback>{getInitials(selectedMember.fullname)}</AvatarFallback>
                  </Avatar>
                  {selectedMember.fullname}
                </DialogTitle>
                <DialogDescription>
                  Chi tiết thông tin thành viên
                </DialogDescription>
              </DialogHeader>

              {/* Editable fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <Input name="email" value={editData.email ?? selectedMember.email} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <School className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Mã sinh viên</p>
                      <Input name="student_code" value={editData.student_code ?? selectedMember.student_code} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserRound className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Lớp</p>
                      <Input name="class_name" value={editData.class_name ?? selectedMember.class_name} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ngày sinh</p>
                      <Input name="dob" value={editData.dob ?? selectedMember.dob} onChange={handleEditChange} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Team</p>
                      <Input name="team" value={editData.team ?? selectedMember.team} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Khoá</p>
                      <Input name="batch" value={editData.batch ?? selectedMember.batch} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Giới tính</p>
                      <Input name="gender" value={editData.gender ?? selectedMember.gender} onChange={handleEditChange} />
                    </div>
                  </div>
                  {selectedMember.phone_number && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Số điện thoại</p>
                        <Input name="phone_number" value={editData.phone_number ?? selectedMember.phone_number} onChange={handleEditChange} />
                      </div>
                    </div>
                  )}
                  {selectedMember.facebook_link && (
                    <div className="flex items-start gap-2">
                      <Facebook className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Facebook</p>
                        <Input name="facebook_link" value={editData.facebook_link ?? selectedMember.facebook_link} onChange={handleEditChange} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row justify-end gap-2">
                <Button onClick={handleEditSave} variant="default" className="w-full md:w-auto">Lưu thay đổi</Button>
                <Button onClick={() => setSelectedMember(null)} variant="outline" className="w-full md:w-auto">Đóng</Button>
                {/* Remove member button opens confirmation dialog directly */}
                <Button 
                  variant="destructive" 
                  className="w-full md:w-auto"
                  onClick={() => {
                    setRemoveConfirm('');
                    setRemoveError(null);
                    setRemoving(false);
                    console.log('Open remove confirmation dialog for', selectedMember?.id, selectedMember?.fullname);
                    setShowRemoveDialog(true);
                  }}
                >
                  Xoá thành viên
                </Button>
              </div>

              {/* Remove confirmation dialog */}
              {showRemoveDialog && (
                <Dialog open={showRemoveDialog} onOpenChange={(open) => { if (!open) setShowRemoveDialog(false); }}>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Xác nhận xoá thành viên</DialogTitle>
                      <DialogDescription>Nhập mã xác nhận <b>REMOVE</b> để xoá thành viên này.</DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="Nhập REMOVE để xác nhận"
                      value={removeConfirm}
                      onChange={e => setRemoveConfirm(e.target.value)}
                      disabled={removing}
                    />
                    {removeError && <div className="text-red-500 text-sm mt-2">{removeError}</div>}
                    <div className="flex justify-end gap-2 mt-4">
                      <Button onClick={handleRemoveMember} variant="destructive" disabled={removing}>
                        {removing ? 'Đang xoá...' : 'Xoá'}
                      </Button>
                      <Button onClick={() => { setRemoveConfirm(''); setRemoveError(null); setShowRemoveDialog(false); }} variant="outline" disabled={removing}>
                        Huỷ
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
