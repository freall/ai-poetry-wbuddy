import slugsData from "../../../slugs.json";

import { WorkDetailClient } from "../../components/work-detail-client";

// Pre-generate all work detail pages from local slug list
export function generateStaticParams() {
  return slugsData;
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  // Next.js static export may leave CJK slugs URL-encoded (e.g. %E5%A4%9C...),
  // decode them so Supabase queries match the actual slug values.
  const slug = decodeURIComponent(rawSlug);
  return <WorkDetailClient slug={slug} />;
}
