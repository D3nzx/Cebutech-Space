import { supabase } from '../lib/supabaseClient';

const baseSelect = `
  *,
  comments:report_approval_comments(*)
`;

const mapStatus = {
  pending: 'pending',
  dean_rejected: 'dean_rejected',
  dean_approved: 'dean_approved',
  cd_rejected: 'cd_rejected',
  cd_approved: 'cd_approved',
  ready: 'ready'
};

export const createReportApprovalRequest = async (payload) => {
  // If dean_id or campus_director_id not provided, fetch them
  let deanId = payload.deanId;
  let campusDirectorId = payload.campusDirectorId;

  if (!deanId) {
    const { data: dean } = await supabase.from('deans').select('id').limit(1).maybeSingle();
    deanId = dean?.id || null;
  }

  if (!campusDirectorId) {
    const { data: cd } = await supabase.from('campus_directors').select('id').limit(1).maybeSingle();
    campusDirectorId = cd?.id || null;
  }

  const insertData = {
    program_head_id: payload.programHeadId,
    dean_id: deanId,
    campus_director_id: campusDirectorId,
    faculty_id: payload.facultyId,
    academic_year: payload.academicYear || null,
    section: payload.section || null,
    status: mapStatus.pending,
    report_payload: payload.reportPayload || {},
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('report_approval_requests')
    .insert(insertData)
    .select(baseSelect)
    .single();

  return { data, error };
};

export const getRequestsForRole = async (role, userId) => {
  const columnMap = {
    dean: 'dean_id',
    campus_director: 'campus_director_id',
    program_head: 'program_head_id'
  };
  const column = columnMap[role];
  if (!column) return { data: [], error: new Error('Unsupported role') };

  const { data, error } = await supabase
    .from('report_approval_requests')
    .select(baseSelect)
    .eq(column, userId)
    .order('created_at', { ascending: false });

  return { data, error };
};

export const getRequestById = async (id) => {
  const { data, error } = await supabase
    .from('report_approval_requests')
    .select(baseSelect)
    .eq('id', id)
    .single();

  return { data, error };
};

export const addApprovalComment = async ({ requestId, actorRole, actorId, comment }) => {
  const insertData = {
    request_id: requestId,
    actor_role: actorRole,
    actor_id: actorId,
    comment,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('report_approval_comments')
    .insert(insertData)
    .select()
    .single();

  return { data, error };
};

export const updateRequestStatus = async ({ requestId, status, actorRole, actorId, comment }) => {
  const dbStatus = mapStatus[status] || status;

  const updates = {
    status: dbStatus,
    updated_at: new Date().toISOString(),
    last_actor_role: actorRole,
    last_actor_id: actorId
  };

  if (dbStatus === mapStatus.cd_approved) {
    updates.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('report_approval_requests')
    .update(updates)
    .eq('id', requestId)
    .select(baseSelect)
    .single();

  if (error) return { data: null, error };

  if (comment) {
    await addApprovalComment({ requestId, actorRole, actorId, comment });
  }

  return { data, error: null };
};

export const acknowledgeReady = async ({ requestId }) => {
  const { data, error } = await supabase
    .from('report_approval_requests')
    .update({ status: mapStatus.ready, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select(baseSelect)
    .single();

  return { data, error };
};

export const archiveApprovalRequest = async ({ requestId }) => {
  const { data, error } = await supabase
    .from('report_approval_requests')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', requestId)
    .select(baseSelect)
    .single();

  return { data, error };
};

export const restoreApprovalRequest = async ({ requestId }) => {
  const { data, error } = await supabase
    .from('report_approval_requests')
    .update({ archived_at: null })
    .eq('id', requestId)
    .select(baseSelect)
    .single();

  return { data, error };
};

export const deleteApprovalRequest = async (requestId) => {
  const { data: requestRow, error: requestError } = await supabase
    .from('report_approval_requests')
    .select('status')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) {
    return { data: null, error: requestError, count: 0 };
  }

  if (!requestRow) {
    return { data: null, error: null, count: 0 };
  }

  const protectedStatuses = new Set(['cd_approved', 'ready']);
  if (protectedStatuses.has(requestRow.status)) {
    return { data: null, error: new Error('Approved reports cannot be deleted.'), count: 0 };
  }

  // First delete any related comments (if foreign keys do not cascade)
  const { error: commentsError } = await supabase
    .from('report_approval_comments')
    .delete()
    .eq('request_id', requestId);

  if (commentsError) {
    return { data: null, error: commentsError, count: 0 };
  }

  const { error, count } = await supabase
    .from('report_approval_requests')
    .delete({ count: 'exact' })
    .eq('id', requestId);

  return { data: null, error, count };
};
