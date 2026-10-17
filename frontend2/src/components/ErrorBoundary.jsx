import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-bold text-danger">Something crashed</h1>
        <p className="mt-1 text-sm text-muted">Copy the text below and send it over.</p>
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-white p-4 text-xs shadow-sm">
          {String(error?.stack || error)}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Reload
        </button>
      </div>
    );
  }
}