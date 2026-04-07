import { redirect } from 'next/navigation';

export default function LegacyStorePage({ params }) {
  const { storeId } = params;
  redirect(`/home/stores/${storeId}`);
}
