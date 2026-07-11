import React from 'react';
import DeanReports from '../../components/Dean/DeanDashboard/DeanReports';

function ScheduleReportsPage({ deanData }) {
  return (
    <div>
      <DeanReports deanData={deanData} />
    </div>
  );
}

export default ScheduleReportsPage;
