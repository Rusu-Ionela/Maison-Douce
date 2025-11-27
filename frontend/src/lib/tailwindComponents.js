// frontend/src/lib/tailwindComponents.js
/**
 * Reusable Tailwind component classes and helper functions
 * for consistent styling across the app.
 */

export const colors = {
    primary: 'bg-pink-500 hover:bg-pink-600',
    secondary: 'bg-purple-500 hover:bg-purple-600',
    danger: 'bg-red-500 hover:bg-red-600',
    success: 'bg-green-500 hover:bg-green-600',
    neutral: 'bg-gray-500 hover:bg-gray-600',
};

export const buttons = {
    primary: `px-4 py-2 rounded-lg font-semibold text-white ${colors.primary} transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`,
    secondary: `px-4 py-2 rounded-lg font-semibold text-white ${colors.secondary} transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50`,
    success: `px-4 py-2 rounded-lg font-semibold text-white ${colors.success} transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50`,
    outline: `px-4 py-2 rounded-lg font-semibold border-2 border-pink-500 text-pink-500 hover:bg-pink-50 transition-all duration-200 disabled:opacity-50`,
    small: `px-3 py-1 rounded text-sm font-semibold text-white ${colors.primary} transition-all`,
}; export const cards = {
    default: `bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200`,
    bordered: `bg-white rounded-lg border-2 border-pink-200 p-6 hover:border-pink-400 transition-colors`,
    elevated: `bg-white rounded-lg shadow-lg p-6`,
};

export const inputs = {
    default: `w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-pink-500 transition-colors`,
    error: `w-full px-4 py-2 border-2 border-red-500 rounded-lg focus:outline-none focus:border-red-600 transition-colors`,
};

export const containers = {
    pageMax: `max-w-7xl mx-auto px-4 py-8`,
    section: `py-8 px-4`,
};

export const typography = {
    h1: `text-4xl font-bold text-gray-900 mb-4`,
    h2: `text-3xl font-bold text-gray-900 mb-3`,
    h3: `text-2xl font-semibold text-gray-800 mb-2`,
    body: `text-gray-700 leading-relaxed`,
    small: `text-sm text-gray-600`,
};

export const grids = {
    columns2: `grid grid-cols-1 md:grid-cols-2 gap-6`,
    columns3: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`,
    columns4: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`,
};

export const badges = {
    success: `inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold`,
    warning: `inline-block px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-semibold`,
    error: `inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-semibold`,
    info: `inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold`,
};
