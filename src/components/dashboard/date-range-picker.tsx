"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}

export function DateRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="start-date" className="text-xs">
          시작일
        </Label>
        <Input
          id="start-date"
          type="date"
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>
      <span className="pb-1 text-muted-foreground">~</span>
      <div className="space-y-1">
        <Label htmlFor="end-date" className="text-xs">
          종료일
        </Label>
        <Input
          id="end-date"
          type="date"
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>
    </div>
  );
}
