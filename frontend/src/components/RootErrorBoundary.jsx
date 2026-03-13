import React from "react";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("RootErrorBoundary caught an error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white px-6 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-500">
            App Error
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            A aparut o eroare neasteptata.
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Aplicatia a intampinat o problema in timpul randarii. Reincarca
            pagina si incearca din nou.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Reincarca pagina
          </button>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
