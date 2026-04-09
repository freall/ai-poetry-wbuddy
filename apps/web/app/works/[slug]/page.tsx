import slugsData from "../../../slugs.json";

import { WorkDetailClient } from "../../components/work-detail-client";

// Pre-generate all work detail pages from local slug list
export function generateStaticParams() {
  return slugsData;
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WorkDetailClient slug={slug} />;
}
