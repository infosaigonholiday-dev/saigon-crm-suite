import { Construction } from "lucide-react";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
      <Construction className="h-12 w-12 mb-4" />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm mt-1">Tính năng đang được phát triển</p>
    </div>
  );
}
