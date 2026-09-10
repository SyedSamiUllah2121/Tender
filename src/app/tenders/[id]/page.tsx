import type {Metadata} from 'next';
import {TenderDetailView} from '../../../views/TenderDetailView';

export const metadata: Metadata = {title: 'Tender Detail'};

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  return <TenderDetailView tenderId={id} />;
}
