import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function RouteError() {
    const error = useRouteError();
    let title = "Ceva n-a mers";
    let message = "ÃŽncearcÄƒ din nou sau mergi la Home.";
    let code = 500;

    if (isRouteErrorResponse(error)) {
        code = error.status;
        title = `${code} ${error.statusText}`;
        message = error.data?.message || message;
    } else if (error instanceof Error) {
        message = error.message;
    }

    return (
        <div className="p-8 text-center">
            <h1 className="text-3xl font-semibold mb-2">{title}</h1>
            <p className="mb-6">{message}</p>
            <Link className="text-blue-600 underline" to="/">ÃŽnapoi la Home</Link>
        </div>
    );
}

