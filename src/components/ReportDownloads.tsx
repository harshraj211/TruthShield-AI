import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import {
  downloadReportHtml,
  downloadReportJson,
  openReportPrintToPdf,
  type ReportPayload,
} from "@/lib/report";

export function ReportDownloads({ payload, fileStem }: { payload: ReportPayload; fileStem?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => downloadReportJson(payload, fileStem)}>
        <Download className="h-4 w-4" /> JSON
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => downloadReportHtml(payload, fileStem)}>
        <Download className="h-4 w-4" /> HTML
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => openReportPrintToPdf(payload)}>
        <Printer className="h-4 w-4" /> Print to PDF
      </Button>
    </div>
  );
}
