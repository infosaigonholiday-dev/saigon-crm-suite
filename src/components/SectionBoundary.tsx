import { Component, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight per-section error boundary. Prevents one widget from
 * crashing the entire Dashboard. Renders an inline fallback card.
 */
export class SectionBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionBoundary:${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/30">
          <CardContent className="py-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Không tải được: {this.props.name}</p>
              <p className="text-muted-foreground mt-1">
                {this.state.error?.message || "Đã xảy ra lỗi khi hiển thị mục này."}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
