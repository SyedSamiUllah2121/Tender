import type {Metadata} from 'next';
import {TenderFormView} from '../../../views/TenderFormView';

export const metadata: Metadata = {title: 'New Tender Bid'};

export default function NewTenderPage() {
  return <TenderFormView />;
}
