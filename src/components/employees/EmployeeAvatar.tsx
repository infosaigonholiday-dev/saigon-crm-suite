import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function EmployeeAvatar({ url, name, size = 32, className }: Props) {
  const px = `${size}px`;
  return (
    <Avatar className={cn(className)} style={{ height: px, width: px }}>
      {url && <AvatarImage src={url} alt={name ?? ""} />}
      <AvatarFallback className="bg-primary/10 text-primary font-medium" style={{ fontSize: Math.max(10, size / 2.8) }}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
