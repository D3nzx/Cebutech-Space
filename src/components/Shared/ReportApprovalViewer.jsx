import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ReportsPrintView from './ReportsPrintView';

const actionLabels = {
  dean_rejected: 'Send Back to Program Head',
  dean_approved: 'Forward to Campus Director',
  cd_rejected: 'Send Back to Program Head',
  cd_approved: 'Approve and Notify Program Head'
};

function ReportApprovalViewer({
  request,
  onApprove,
  onReject,
  role,
  onClose,
  loading = false
}) {
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState('');
  const [isClient, setIsClient] = useState(false);
  const payload = request?.report_payload || {};
  const summaryTotals = payload.summaryTotals || {};
  const summaryRows = payload.summaryRows || [];
  const summaryRowsPage2 = payload.summaryRowsPage2 || [];
  const filteredSchedules = payload.filteredSchedules || [];
  const filteredSchedulesPage2 = payload.filteredSchedulesPage2 || [];
  const page2Meta = payload.page2Meta || {};

  const isDean = role === 'dean';
  const isCampusDirector = role === 'campus_director';
  const isTeacher = page === 1;

  const signatureRoleName = isCampusDirector ? 'Dean' : isDean ? 'Dean' : 'Program Head';
  const signatureRoleDisplayName = isCampusDirector
    ? payload.deanName
    : isDean
      ? payload.deanName
      : payload.programHeadName;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleApprove = () => {
    if (onApprove) onApprove(comment);
    // Clear any typed comment after approval so it is not left behind
    setComment('');
  };

  const handleReject = () => {
    if (!comment || comment.trim().length === 0) {
      alert('Please provide a comment when sending back the report.');
      return;
    }
    if (onReject) onReject(comment);
  };

  if (!isClient) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Approval Request</p>
            <h2 className="text-lg font-semibold text-slate-900">{payload?.facultyLabel || 'Report'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
            aria-label="Close"
            title="Close"
          >
            X
          </button>
        </div>

        {/* Page Toggle - Fixed below header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPage(1)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 ${
                isTeacher
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
              }`}
              style={{ outline: 'none', border: 'none' }}
              onMouseDown={(e) => e.preventDefault()}
              title="Program by Teacher"
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setPage(2)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 ${
                !isTeacher
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
              }`}
              style={{ outline: 'none', border: 'none' }}
              onMouseDown={(e) => e.preventDefault()}
              title="Program by Section"
            >
              Section
            </button>
          </div>
        </div>

        {/* Report Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <ReportsPrintView
              page={page}
              onClose={onClose}
              onPrint={() => window.print()}
              programHeadName={payload.programHeadName}
              facultyLabel={payload.facultyLabel}
              filteredSchedules={page === 1 ? filteredSchedules : filteredSchedulesPage2}
              summaryTotals={page === 1 ? summaryTotals : payload.summaryTotalsPage2 || summaryTotals}
              summaryRows={summaryRows}
              summaryRowsPage2={summaryRowsPage2}
              roleName={signatureRoleName}
              roleDisplayName={signatureRoleDisplayName}
              approvedDisplayName={payload.campusDirectorName}
              pageTitle={page === 1 ? 'Program by Teacher' : 'Program by Section'}
              showProgramTypeAndAcademicPeriod
              printProgramTypeText={payload.printProgramTypeText}
              printAcademicPeriodText={payload.printAcademicPeriodText}
              page2DegreeText={page2Meta.degree || ''}
              page2YearText={page2Meta.year || ''}
              page2SectionText={page2Meta.section || ''}
              reviewedDisplayName={payload.deanName}
              embedded={true}
            />
          </div>
        </div>

        {/* Footer Actions - Fixed at bottom */}
        {(isDean || isCampusDirector) && (
          <div className="border-t border-slate-200 bg-white p-4 flex-shrink-0">
            <div className="flex flex-col gap-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave a comment (required for Send Back)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
              />
              <p className="text-xs text-slate-500">
                Comments are only recorded and sent when you send back the report. Approvals are forwarded without comments.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleReject}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  disabled={!comment.trim() || loading}
                >
                  {isDean ? actionLabels.dean_rejected : actionLabels.cd_rejected}
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (isDean ? actionLabels.dean_approved : actionLabels.cd_approved)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ReportApprovalViewer;
