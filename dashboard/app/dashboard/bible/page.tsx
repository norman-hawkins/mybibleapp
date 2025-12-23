import BibleExplorer from "@/components/bible/BibleExplorer";
import Topbar from "@/components/dashboard/Topbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BiblePage() {
  return (
    <div className="space-y-6">
      <Topbar
        title="Bible Navigator"
        subtitle="Browse Bible text from the dashboard API (WEB / KJV)"
      />

      <BibleExplorer />
    </div>
  );
}