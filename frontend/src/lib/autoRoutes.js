// Creează automat rute pentru toate fișierele din src/pages
// Necesită ca fiecare fișier din /pages să aibă export default (un component React)

const files = import.meta.glob('/src/pages/**/*.{jsx,tsx}', { eager: true });

function toKebab(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // CamelCase -> kebab
        .replace(/[\s_]+/g, '-')                // spații/underscore -> -
        .toLowerCase();
}

export function buildAutoRoutes() {
    const routes = [];

    for (const fullPath in files) {
        const mod = files[fullPath];
        const Component = mod?.default;
        if (!Component) continue;

        // exemplu path: /src/pages/Admin/AdminComenzi.jsx
        const pathRel = fullPath.split('/src/pages/')[1];       // Admin/AdminComenzi.jsx
        const name = pathRel.replace(/\.(jsx|tsx)$/, '');       // Admin/AdminComenzi
        const parts = name.split('/');                          // ["Admin","AdminComenzi"]

        // definim un path stabil sub /p/ ca să nu calce peste rutele tale făcute manual
        const slug = parts.map(p => toKebab(p)).join('/');      // "admin/admin-comenzi"
        const finalPath = `/p/${slug}`;                         // ex: /p/admin/admin-comenzi

        routes.push({
            path: finalPath,
            name,            // pentru listă/meniuri
            Component
        });
    }

    // sortare alfabetică pentru meniu
    routes.sort((a, b) => a.name.localeCompare(b.name));
    return routes;
}
