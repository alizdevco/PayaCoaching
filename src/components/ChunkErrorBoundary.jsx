import { Component } from "react";
import { AlertCircle } from "lucide-react";

import Button from "./Button.jsx";

function isChunkLoadError(error) {
  if (!error) return false;

  const message = typeof error.message === "string" ? error.message : "";

  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error, errorInfo) {
    if (isChunkLoadError(error)) {
      console.warn("[ChunkErrorBoundary] Chunk load failed:", error, errorInfo);
    }
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    const { error, isChunkError } = this.state;

    if (error && !isChunkError) {
      throw error;
    }

    if (error && isChunkError) {
      return (
        <div
          className="flex min-h-[50vh] items-center justify-center px-4"
          dir="rtl"
        >
          <div
            className="flex max-w-md flex-col items-center justify-center gap-4 text-center"
            role="alert"
          >
            <AlertCircle
              size={36}
              className="text-amber-500 dark:text-amber-400"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              مشکل در اتصال به اینترنت پیش اومده، لطفاً دوباره تلاش کنید.
            </p>
            <Button variant="primary" onClick={this.handleRetry}>
              تلاش مجدد
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
