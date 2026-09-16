import type {Metadata} from 'next';
import {TendersView} from '../../../views/TendersView';

export const metadata: Metadata = {title: 'Tenders Pipeline'};

export default function TendersPage() {
  return <TendersView />;
}
