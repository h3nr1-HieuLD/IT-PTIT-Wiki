import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/supabase/database.types'

export async function GET() {
  // Always use the service role key for admin fetch
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase.from('members').select('*')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const memberData = await request.json()
  const { id, ...updateData } = memberData
  if (!id) {
    console.log('[PUT] Missing member ID', memberData)
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
  }
  console.log('[PUT] Updating member', { id, updateData })
  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select()
  if (error) {
    console.error('[PUT] Error updating member:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log('[PUT] Update result:', data)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const memberData = await request.json();
  // Validate required fields
  const requiredFields = [
    'fullname', 'email', 'team', 'class_name', 'student_code', 'batch', 'dob', 'gender', 'main_pic'
  ];
  for (const field of requiredFields) {
    if (
      memberData[field] === undefined || memberData[field] === null || memberData[field] === ''
    ) {
      console.log('[POST] Missing required field:', field, memberData)
      return NextResponse.json({ error: `Missing required field: ${field}`, debug: memberData }, { status: 400 });
    }
  }
  // Extra debug: log types and values
  for (const field of requiredFields) {
    console.log(`[POST] Field ${field}:`, memberData[field], 'Type:', typeof memberData[field]);
  }
  console.log('[POST] Inserting member:', memberData)
  const { data, error } = await supabase
    .from('members')
    .insert([memberData])
    .select();
  if (error) {
    console.error('[POST] Error inserting member:', error, memberData)
    return NextResponse.json({ error: error.message, debug: memberData }, { status: 500 });
  }
  console.log('[POST] Insert result:', data)
  return NextResponse.json(data && data[0] ? data[0] : data);
}

export async function DELETE(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { id } = await request.json();
  if (!id) {
    console.log('[DELETE] Missing member ID')
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
  }
  console.log('[DELETE] Removing member with ID:', id)
  const { data, error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .select();
  if (error) {
    console.error('[DELETE] Error removing member:', error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log('[DELETE] Remove result:', data)
  return NextResponse.json(data)
}
