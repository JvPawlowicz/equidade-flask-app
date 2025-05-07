import React from 'react';
import Schedule from '@/components/schedule/Schedule';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { AppLayout } from '@/components/layout/app-layout';

export default function SchedulePage() {
  return (
    <AppLayout>
      <CalendarProvider>
        <Schedule />
      </CalendarProvider>
    </AppLayout>
  );
}