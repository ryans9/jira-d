import { storage } from '@forge/api';

const siteKey = (context) => {
    const cid = context?.cloudId ?? 'unknown-cloud';
    const iid =
        context?.installation?.id ??
        context?.installContext?.installationId ??
        'unknown-install';
    return `users:${cid}:${iid}`;
};

export async function httpGet(request, context) {
    try {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') ?? 0);

        const base = siteKey(context);
        const meta = (await storage.get(`${base}:meta`)) || {
            total: 0,
            pages: 0,
            lastSyncAt: null,
        };
        const items = (await storage.get(`${base}:page:${page}`)) || [];

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    users: items,
                    totalCount: meta.total,
                    pages: meta.pages,
                    page,
                    lastSyncAt: meta.lastSyncAt,
                },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e) {
        return new Response(
            JSON.stringify({ success: false, error: e.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
