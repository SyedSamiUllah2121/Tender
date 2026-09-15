import type {Metadata} from 'next';
import {MonitoringView} from '../../views/MonitoringView';

export const metadata: Metadata = {title: 'Management & Admin Monitoring'};

export default function MonitoringPage() {
  return <MonitoringView />;
}
