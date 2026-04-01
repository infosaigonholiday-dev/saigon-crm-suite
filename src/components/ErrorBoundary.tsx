import { Component, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <h2 className="text-lg font-semibold">Đã xảy ra lỗi</h2>
              <p className="text-sm text-muted-foreground text-center">
                Vui lòng tải lại trang hoặc thử lại sau.
              </p>
              <Button onClick={() => window.location.reload()}>Tải lại</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
