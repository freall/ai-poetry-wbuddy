import { WorkDetailClient } from "../../components/work-detail-client";

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WorkDetailClient slug={slug} />;
}
