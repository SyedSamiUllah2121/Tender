import type {Metadata} from 'next';
import {ReportsView} from '../../../views/ReportsView';

export const metadata: Metadata = {title: 'Performance Reports'};

export default function ReportsPage() {
  return <ReportsView />;
}
