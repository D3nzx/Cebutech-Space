import React from 'react';
import { X } from 'lucide-react';
import WeeklyTimetable from '../ProgramHead/ProgramHeadDashboard/Scheduling/WeeklyTimetable';
import ctuLogo from '../../assets/svg/CTU_logo.svg';
import bagongPilipinasLogo from '../../assets/images/Bagong_Pilipinas_logo.png';

const ctuCcFormat = new URL('../../assets/images/CTU CC FORMAT.png', import.meta.url).href;

// printStyles string reused from DeanReports, tuned for Legal-size (8.5in x 14in) single-page output
const printStyles = `
@page {
  size: legal portrait;
  margin: 10mm;
}

.report-print-area { background: white }

@media print {
  html, body {
    width: 8.5in;
    height: 14in;
    margin: 0;
    padding: 0;
  }

  /* If the report is inside a scrollable modal/container, disable clipping for print */
  .hide-scrollbar {
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
    max-width: none !important;
  }

  body * { visibility: hidden }
  .report-print-area, .report-print-area * { visibility: visible }

  .report-print-area {
    /* Use fixed so it isn't clipped by any scroll container */
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    box-sizing: border-box;
    padding-bottom: 140px;
  }

  .report-signature {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
  }
}
`;

export default function ReportsPrintView({
  page = 1,
  onClose = () => {},
  onPrint = () => {},
  programHeadName = '',
  facultyLabel = '',
  filteredSchedules = [],
  summaryTotals = { preparations: 0, units: 0, hoursPerWeek: 0 },
  summaryRows = [],
  summaryRowsPage2 = [],
  roleName = '',
  roleDisplayName = '',
  page2DegreeText = '',
  page2YearText = '',
  page2SectionText = '',
  reviewedDisplayName = '',
  approvedDisplayName = '',
  pageTitle = '',
  pageSubtitle = '',
  showProgramTypeAndAcademicPeriod = false,
  printProgramTypeText = '',
  printAcademicPeriodText = '',
  embedded = false // When true, renders without the fixed overlay (for use inside ReportApprovalViewer)
}) {
  if (page === 1) {
    // If embedded, render without the fixed overlay
    if (embedded) {
      return (
        <div className="w-full">
          <style>{printStyles}</style>
          <div className="report-print-area space-y-6 print:space-y-4 p-4 md:p-6">
            <div className="block mb-4">
              <div className="report-avoid-break">
                <div className="flex items-center justify-center gap-0">
                  <img src={ctuLogo} alt="CTU Logo" className="h-20 w-auto mr-3" />
                  <div className="text-center leading-tight flex-shrink-0 px-0">
                    <p className="text-[12px]">Republic of the Philippines</p>
                    <p className="text-[16px] font-semibold">CEBU TECHNOLOGICAL UNIVERSITY</p>
                    <p className="text-[12px] font-semibold">CONSOLACION CAMPUS</p>
                    <p className="text-[11px]">Gov. F. B. Harrison Ave., Nangka, Consolacion, Cebu, Philippines</p>
                    <p className="text-[11px]">Website: http://www.ctu.edu.ph E-mail: cduconsolacion@ctu.edu.ph</p>
                    <p className="text-[12px] font-semibold">COLLEGE OF COMPUTING, BUSINESS, AND MANAGEMENT</p>
                  </div>
                  <img src={bagongPilipinasLogo} alt="Bagong Pilipinas Logo" className="h-20 w-auto ml-3" />
                </div>
                <div className="text-center mt-2">
                  <p className="text-[16px] font-semibold">PROGRAM BY TEACHER</p>
                  {showProgramTypeAndAcademicPeriod && (
                    <>
                      <p className="text-[13px]">{printProgramTypeText}</p>
                      <p className="text-[13px] underline">{printAcademicPeriodText}</p>
                    </>
                  )}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-10 text-[12px]">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="w-28">Name:</span>
                      <span className="flex-1 border-b border-slate-500 font-semibold">{facultyLabel || ''}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Bachelor's Degree:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Master's Degree:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Doctorate Degree:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Special Training:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="grid grid-cols-[9rem_1fr] gap-x-2">
                      <span>Status of Appointment:</span>
                      <span></span>

                      <span></span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-slate-700"></span>
                        <span>Permanent</span>
                      </div>

                      <span></span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-slate-700"></span>
                        <span>Temporary</span>
                      </div>

                      <span></span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-slate-700"></span>
                        <span>Contract of Service</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex gap-2">
                        <span className="w-16">Major:</span>
                        <span className="flex-1 border-b border-slate-500"></span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-16">Minor:</span>
                        <span className="flex-1 border-b border-slate-500"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border-slate-200 rounded-xl overflow-hidden mt-4">
                  <div className="report-timetable">
                    <WeeklyTimetable
                      schedules={filteredSchedules}
                      programHeadData={{}}
                      showLegend={false}
                      showCourseInfo={false}
                      showYearPrefix={false}
                      printCompact={true}
                      highlightApprovedOnly={true}
                    />
                  </div>

                  <div className="px-2 pt-2 report-avoid-break report-summary">
                    <div className="border-t-2 border-black pt-2">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr>
                            <th colSpan={3} className="text-center font-bold py-1">SUMMARY OF COURSES</th>
                          </tr>
                          <tr className="border-b border-black">
                            <th className="text-center font-bold py-1">Course code</th>
                            <th className="text-center font-bold py-1">Descriptive Title</th>
                            <th className="text-center font-bold py-1">Degree/Yr/Sec</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(summaryRows) && summaryRows.map((row, idx) => (
                            <tr key={`${row.courseCode}-${row.degreeYrSec}-${idx}`}>
                              <td className="text-center py-0.5 pr-2">{row.courseCode}</td>
                              <td className="text-center py-0.5 px-2">{row.descriptiveTitle}</td>
                              <td className="text-center py-0.5 pl-2">{row.degreeYrSec}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3} className="h-8"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-[12px]">
                      <div className="grid grid-cols-2 gap-x-8">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-32">No. of Preparations:</span>
                            <span>{summaryTotals.preparations}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-32">No. of Units:</span>
                            <span>{summaryTotals.units}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-32">No. of Hours/Week:</span>
                            <span>{Number.isInteger(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek : Number.isFinite(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek.toFixed(2) : 0}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between">
                            <span>Administrative Designation:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Production:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Extension:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Research:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-2 pt-4 text-[12px] report-avoid-break report-signature">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-[12px] font-bold">Prepared by:</p>
                      <div className="relative mx-auto h-16 w-44 mt-2">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                            {programHeadName}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]">Program Coordinator</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[12px] font-bold">Reviewed, Certified True and Correct:</p>
                      <div className="relative mx-auto h-16 w-44 mt-2">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                            {roleDisplayName}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]">{roleName === 'Dean' ? 'College Dean' : roleName}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[12px] font-bold">Approved:</p>
                      <div className="relative mx-auto h-16 w-44 mt-2">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                            {approvedDisplayName ? approvedDisplayName : ''}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]">Campus Director</p>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-center">
                    <img src={ctuCcFormat} alt="CTU CC Format" className="max-w-full h-auto object-contain" />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Non-embedded mode for Page 1
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[110] bg-white/10 text-white border border-white/20 rounded-xl p-2.5 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/20 hover:scale-105 print:hidden"
          type="button"
        >
          <X size={20} />
        </button>
        <div className="relative w-full h-full max-w-[8.5in] max-h-[14in] bg-white shadow-2xl overflow-auto rounded-lg hide-scrollbar">
          <style>{` .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar::-webkit-scrollbar-track { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } ` + printStyles}</style>
          <div className="report-print-area space-y-6 print:space-y-4 p-4 md:p-6">
            <div className="block mb-4">
              <div className="report-avoid-break">
                <div className="flex items-center justify-center gap-0">
                  <img src={ctuLogo} alt="CTU Logo" className="h-20 w-auto mr-3" />
                  <div className="text-center leading-tight flex-shrink-0 px-0">
                    <p className="text-[12px]">Republic of the Philippines</p>
                    <p className="text-[16px] font-semibold">CEBU TECHNOLOGICAL UNIVERSITY</p>
                    <p className="text-[12px] font-semibold">CONSOLACION CAMPUS</p>
                    <p className="text-[11px]">Gov. F. B. Harrison Ave., Nangka, Consolacion, Cebu, Philippines</p>
                    <p className="text-[11px]">Website: http://www.ctu.edu.ph E-mail: cduconsolacion@ctu.edu.ph</p>
                    <p className="text-[12px] font-semibold">COLLEGE OF COMPUTING, BUSINESS, AND MANAGEMENT</p>
                  </div>
                  <img src={bagongPilipinasLogo} alt="Bagong Pilipinas Logo" className="h-20 w-auto ml-3" />
                </div>
                <div className="text-center mt-2">
                  <p className="text-[16px] font-semibold">PROGRAM BY TEACHER</p>
                  {showProgramTypeAndAcademicPeriod && (
                    <>
                      <p className="text-[13px]">{printProgramTypeText}</p>
                      <p className="text-[13px] underline">{printAcademicPeriodText}</p>
                    </>
                  )}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-10 text-[12px]">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="w-28">Name:</span>
                      <span className="flex-1 border-b border-slate-500 font-semibold">{facultyLabel || ''}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Bachelor's Degree:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Master's Degree:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Doctorate Degree:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-28">Special Training:</span>
                      <span className="flex-1 border-b border-slate-500"></span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="grid grid-cols-[9rem_1fr] gap-x-2">
                      <span>Status of Appointment:</span>
                      <span></span>

                      <span></span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-slate-700"></span>
                        <span>Permanent</span>
                      </div>

                      <span></span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-slate-700"></span>
                        <span>Temporary</span>
                      </div>

                      <span></span>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-slate-700"></span>
                        <span>Contract of Service</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex gap-2">
                        <span className="w-16">Major:</span>
                        <span className="flex-1 border-b border-slate-500"></span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-16">Minor:</span>
                        <span className="flex-1 border-b border-slate-500"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border-slate-200 rounded-xl overflow-hidden mt-4">
                  <div className="report-timetable">
                    <WeeklyTimetable
                      schedules={filteredSchedules}
                      programHeadData={{}}
                      showLegend={false}
                      showCourseInfo={false}
                      showYearPrefix={false}
                      printCompact={true}
                      highlightApprovedOnly={true}
                    />
                  </div>

                  <div className="px-2 pt-2 report-avoid-break report-summary">
                    <div className="border-t-2 border-black pt-2">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr>
                            <th colSpan={3} className="text-center font-bold py-1">SUMMARY OF COURSES</th>
                          </tr>
                          <tr className="border-b border-black">
                            <th className="text-center font-bold py-1">Course code</th>
                            <th className="text-center font-bold py-1">Descriptive Title</th>
                            <th className="text-center font-bold py-1">Degree/Yr/Sec</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(summaryRows) && summaryRows.map((row, idx) => (
                            <tr key={`${row.courseCode}-${row.degreeYrSec}-${idx}`}>
                              <td className="text-center py-0.5 pr-2">{row.courseCode}</td>
                              <td className="text-center py-0.5 px-2">{row.descriptiveTitle}</td>
                              <td className="text-center py-0.5 pl-2">{row.degreeYrSec}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3} className="h-8"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-[12px]">
                      <div className="grid grid-cols-2 gap-x-8">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-32">No. of Preparations:</span>
                            <span>{summaryTotals.preparations}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-32">No. of Units:</span>
                            <span>{summaryTotals.units}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-32">No. of Hours/Week:</span>
                            <span>{Number.isInteger(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek : Number.isFinite(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek.toFixed(2) : 0}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between">
                            <span>Administrative Designation:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Production:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Extension:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                          <div className="flex justify-between">
                            <span>Research:</span>
                            <span className="border-b border-black w-24"></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-2 pt-4 text-[12px] report-avoid-break report-signature">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-[12px] font-bold">Prepared by:</p>
                      <div className="relative mx-auto h-16 w-44 mt-2">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                            {programHeadName}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]">Program Coordinator</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[12px] font-bold">Reviewed, Certified True and Correct:</p>
                      <div className="relative mx-auto h-16 w-44 mt-2">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                            {roleDisplayName}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]">{roleName === 'Dean' ? 'College Dean' : roleName}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[12px] font-bold">Approved:</p>
                      <div className="relative mx-auto h-16 w-44 mt-2">
                        <div className="absolute inset-0 flex items-end justify-center">
                          <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                            {approvedDisplayName ? approvedDisplayName : ''}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12px]">Campus Director</p>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-center">
                    <img src={ctuCcFormat} alt="CTU CC Format" className="max-w-full h-auto object-contain" />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Page 2
  // If embedded, render without the fixed overlay
  if (embedded) {
    return (
      <div className="w-full">
        <style>{printStyles}</style>
        <div className="report-print-area space-y-6 print:space-y-4 p-4 md:p-6">
          <div className="block mb-4">
            <div className="report-avoid-break">
              <div className="flex items-center justify-center gap-0">
                <img src={ctuLogo} alt="CTU Logo" className="h-20 w-auto mr-3" />
                <div className="text-center leading-tight flex-shrink-0 px-0">
                  <p className="text-[12px]">Republic of the Philippines</p>
                  <p className="text-[16px] font-semibold">CEBU TECHNOLOGICAL UNIVERSITY</p>
                  <p className="text-[12px] font-semibold">CONSOLACION CAMPUS</p>
                  <p className="text-[11px]">Gov. F. B. Harrison Ave., Nangka, Consolacion, Cebu, Philippines</p>
                  <p className="text-[11px]">Website: http://www.ctu.edu.ph E-mail: cduconsolacion@ctu.edu.ph</p>
                  <p className="text-[12px] font-semibold">COLLEGE OF COMPUTING, BUSINESS, AND MANAGEMENT</p>
                </div>
                <img src={bagongPilipinasLogo} alt="Bagong Pilipinas Logo" className="h-20 w-auto ml-3" />
              </div>

              <div className="text-center mt-2">
                <p className="text-[16px] font-semibold">PROGRAM BY SECTION</p>
                {showProgramTypeAndAcademicPeriod && (
                  <>
                    <p className="text-[13px]">{printProgramTypeText}</p>
                    <p className="text-[13px] underline">{printAcademicPeriodText}</p>
                  </>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-10 text-[12px]">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="w-14">Degree:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500">{page2DegreeText || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-14">Year:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500">{page2YearText || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-14">Section:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500">{page2SectionText || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-14">Adviser:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500 font-semibold">{facultyLabel || ''}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="w-10">Major:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-slate-200 rounded-xl overflow-hidden">
            <div className="report-timetable">
              <WeeklyTimetable
                schedules={filteredSchedules}
                programHeadData={{}}
                showLegend={false}
                showCourseInfo={false}
                showYearPrefix={false}
                printCompact={true}
                highlightApprovedOnly={true}
              />
            </div>
          </div>

          {/* Summary of Courses for Page 2 */}
          <div className="px-2 pt-2 report-avoid-break report-summary">
            <div className="border-t-2 border-black pt-2">
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="text-center font-bold py-1">SUMMARY OF COURSES</th>
                  </tr>
                  <tr className="border-b border-black">
                    <th className="text-center font-bold py-1">Course code</th>
                    <th className="text-center font-bold py-1">Descriptive Title</th>
                    <th className="text-center font-bold py-1">No. of Units</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(summaryRowsPage2) && summaryRowsPage2.map((row, idx) => (
                    <tr key={`${row.courseCode}-${row.units}-${idx}`}>
                      <td className="py-0 text-center">{row.courseCode}</td>
                      <td className="py-0 px-2 text-center">{row.descriptiveTitle}</td>
                      <td className="py-0 text-center">{row.units}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="h-8"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-[12px]">
              <div className="grid grid-cols-2 gap-x-8">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-[9.9rem]">
                    <span className="w-32">No. of Preparations:</span>
                    <span className="font-semibold">{summaryTotals.preparations}</span>
                  </div>
                  <div className="flex items-center gap-[9.9rem]">
                    <span className="w-32">No. of Hours/Week:</span>
                    <span className="font-semibold">{Number.isInteger(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek : Number.isFinite(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek.toFixed(2) : 0}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-[9.9rem]">
                    <span className="w-32">Total:</span>
                    <span className="font-semibold">{summaryTotals.units}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-2 pt-4 text-[12px] report-avoid-break report-signature">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[12px] font-bold">Prepared by:</p>
                <div className="relative mx-auto h-16 w-44 mt-2">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                      {programHeadName}
                    </p>
                  </div>
                </div>
                <p className="text-[12px]">Program Coordinator</p>
              </div>

              <div className="text-center">
                <p className="text-[12px] font-bold">Reviewed, Certified True and Correct:</p>
                <div className="relative mx-auto h-16 w-44 mt-2">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                      {reviewedDisplayName || ''}
                    </p>
                  </div>
                </div>
                <p className="text-[12px]">College Dean</p>
              </div>

              <div className="text-center">
                <p className="text-[12px] font-bold">Approved:</p>
                <div className="relative mx-auto h-16 w-44 mt-2">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">{approvedDisplayName ? approvedDisplayName : ''}</p>
                  </div>
                </div>
                <p className="text-[12px]">Campus Director</p>
              </div>
            </div>

            <div className="mt-2 flex justify-center">
              <img src={ctuCcFormat} alt="CTU CC Format" className="max-w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Non-embedded mode for Page 2
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 font-sans">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] bg-white/10 text-white border border-white/20 rounded-xl p-2.5 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/20 hover:scale-105 print:hidden"
        type="button"
      >
        <X size={20} />
      </button>
      <div className="relative w-full h-full max-w-[8.5in] max-h-[14in] bg-white shadow-2xl overflow-auto rounded-lg hide-scrollbar">
        <style>{` .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar::-webkit-scrollbar-track { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } ` + printStyles}</style>
        <div className="report-print-area space-y-6 print:space-y-4 p-4 md:p-6">
          <div className="block mb-4">
            <div className="report-avoid-break">
              <div className="flex items-center justify-center gap-0">
                <img src={ctuLogo} alt="CTU Logo" className="h-20 w-auto mr-3" />
                <div className="text-center leading-tight flex-shrink-0 px-0">
                  <p className="text-[12px]">Republic of the Philippines</p>
                  <p className="text-[16px] font-semibold">CEBU TECHNOLOGICAL UNIVERSITY</p>
                  <p className="text-[12px] font-semibold">CONSOLACION CAMPUS</p>
                  <p className="text-[11px]">Gov. F. B. Harrison Ave., Nangka, Consolacion, Cebu, Philippines</p>
                  <p className="text-[11px]">Website: http://www.ctu.edu.ph E-mail: cduconsolacion@ctu.edu.ph</p>
                  <p className="text-[12px] font-semibold">COLLEGE OF COMPUTING, BUSINESS, AND MANAGEMENT</p>
                </div>
                <img src={bagongPilipinasLogo} alt="Bagong Pilipinas Logo" className="h-20 w-auto ml-3" />
              </div>

              <div className="text-center mt-2">
                <p className="text-[16px] font-semibold">PROGRAM BY SECTION</p>
                {showProgramTypeAndAcademicPeriod && (
                  <>
                    <p className="text-[13px]">{printProgramTypeText}</p>
                    <p className="text-[13px] underline">{printAcademicPeriodText}</p>
                  </>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-10 text-[12px]">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="w-14">Degree:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500">{page2DegreeText || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-14">Year:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500">{page2YearText || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-14">Section:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500">{page2SectionText || ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-14">Adviser:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500 font-semibold">{facultyLabel || ''}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="w-10">Major:</span>
                    <span className="flex-1 max-w-xs border-b border-slate-500"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-slate-200 rounded-xl overflow-hidden">
            <div className="report-timetable">
              <WeeklyTimetable
                schedules={filteredSchedules}
                programHeadData={{}}
                showLegend={false}
                showCourseInfo={false}
                showYearPrefix={false}
                printCompact={true}
                highlightApprovedOnly={true}
              />
            </div>
          </div>

          {/* Summary of Courses for Page 2 */}
          <div className="px-2 pt-2 report-avoid-break report-summary">
            <div className="border-t-2 border-black pt-2">
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    <th colSpan={3} className="text-center font-bold py-1">SUMMARY OF COURSES</th>
                  </tr>
                  <tr className="border-b border-black">
                    <th className="text-center font-bold py-1">Course code</th>
                    <th className="text-center font-bold py-1">Descriptive Title</th>
                    <th className="text-center font-bold py-1">No. of Units</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(summaryRowsPage2) && summaryRowsPage2.map((row, idx) => (
                    <tr key={`${row.courseCode}-${row.units}-${idx}`}>
                      <td className="py-0 text-center">{row.courseCode}</td>
                      <td className="py-0 px-2 text-center">{row.descriptiveTitle}</td>
                      <td className="py-0 text-center">{row.units}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="h-8"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-[12px]">
              <div className="grid grid-cols-2 gap-x-8">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-[9.9rem]">
                    <span className="w-32">No. of Preparations:</span>
                    <span className="font-semibold">{summaryTotals.preparations}</span>
                  </div>
                  <div className="flex items-center gap-[9.9rem]">
                    <span className="w-32">No. of Hours/Week:</span>
                    <span className="font-semibold">{Number.isInteger(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek : Number.isFinite(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek.toFixed(2) : 0}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-[9.9rem]">
                    <span className="w-32">Total:</span>
                    <span className="font-semibold">{summaryTotals.units}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-2 pt-4 text-[12px] report-avoid-break report-signature">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[12px] font-bold">Prepared by:</p>
                <div className="relative mx-auto h-16 w-44 mt-2">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                      {programHeadName}
                    </p>
                  </div>
                </div>
                <p className="text-[12px]">Program Coordinator</p>
              </div>

              <div className="text-center">
                <p className="text-[12px] font-bold">Reviewed, Certified True and Correct:</p>
                <div className="relative mx-auto h-16 w-44 mt-2">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">
                      {reviewedDisplayName || ''}
                    </p>
                  </div>
                </div>
                <p className="text-[12px]">College Dean</p>
              </div>

              <div className="text-center">
                <p className="text-[12px] font-bold">Approved:</p>
                <div className="relative mx-auto h-16 w-44 mt-2">
                  <div className="absolute inset-0 flex items-end justify-center">
                    <p className="text-[12px] font-bold uppercase border-b border-black w-full text-center pb-1">{approvedDisplayName ? approvedDisplayName : ''}</p>
                  </div>
                </div>
                <p className="text-[12px]">Campus Director</p>
              </div>
            </div>

            <div className="mt-2 flex justify-center">
              <img src={ctuCcFormat} alt="CTU CC Format" className="max-w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
