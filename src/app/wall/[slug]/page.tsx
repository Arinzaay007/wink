import SprayWall from "@/components/SprayWall";

export const dynamic = "force-dynamic";

export default async function WallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SprayWall slug={slug} />;
}
