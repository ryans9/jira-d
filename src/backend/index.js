import Resolver from '@forge/resolver';
// import { handleInstalled, syncAllUsers } from './sync.js';

// Simple resolver (no @forge/api)
const resolver = new Resolver();


resolver.define('getJiraUsers', async (req) => {
    // Note: This resolver is not used anymore since we call Jira API directly from frontend
    return {
        success: false,
        error: 'This resolver is deprecated. Use frontend direct API calls instead.'
    };
});

// Sync all Jira users to backend
resolver.define('syncUsersToBackend', async (req) => {
    try {
        console.log('🔄 Starting user sync to backend...');

        // This will be called from frontend, so we can't call Jira API here
        // The frontend will fetch users and send them to this resolver
        const { users } = req.payload || {};

        if (!users || !Array.isArray(users)) {
            return {
                success: false,
                error: 'No users provided in payload'
            };
        }

        console.log(`📊 Syncing ${users.length} users to backend...`);

        // Send users to your backend with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await global.fetch('https://53758b93165a.ngrok-free.app/integrations/jira/sync-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Integration-Token': 'default-token'
            },
            body: JSON.stringify({
                users: users,
                syncTime: new Date().toISOString(),
                source: 'forge-app'
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Users synced to backend successfully:', result);
            return {
                success: true,
                message: `Successfully synced ${users.length} users to backend`,
                data: result
            };
        } else {
            const errorText = await response.text();
            console.error('❌ Backend sync error:', response.status, errorText);
            return {
                success: false,
                error: `Backend error: ${response.status} - ${errorText}`
            };
        }
    } catch (error) {
        console.error('❌ Error syncing users to backend:', error);
        if (error.name === 'AbortError') {
            return {
                success: false,
                error: 'Request timed out - backend may be slow or unavailable'
            };
        }
        return {
            success: false,
            error: error.message
        };
    }
});


resolver.define('getBoostData', async (req) => {
    try {
        const { cloudId, accountId } = req.payload || {};
        if (!cloudId || !accountId) {
            return { success: false, error: 'Missing cloudId or accountId' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const url = `https://53758b93165a.ngrok-free.app/integrations/jira/user-stats?cloudId=${encodeURIComponent(cloudId)}&accountId=${encodeURIComponent(accountId)}`;
        const resp = await global.fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'X-Integration-Token': 'default-token' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!resp.ok) {
            const txt = await resp.text();
            return { success: false, error: `Backend error: ${resp.status} - ${txt}` };
        }
        const data = await resp.json();
        // Map backend stats into panel fields
        const mapped = {
            totalBoostsReceived: data?.data?.totalBoostsReceived ?? 0,
            tempBoosts: data?.data?.boostsLeft ?? 0,
            boostsGivenToday: data?.data?.givenToday ?? 0,
        };
        return { success: true, data: mapped };
    } catch (e) {
        if (e.name === 'AbortError') {
            return { success: false, error: 'Request timed out' };
        }
        return { success: false, error: e.message };
    }
});

resolver.define('giveBoost', async (req) => {
    try {
        const { recipientAccountId, recipientName, message, cloudId, actor } = req.payload || {};

        // Validate required fields
        if (!cloudId || !actor) {
            return {
                success: false,
                error: 'Missing required fields: cloudId and actor must be provided from frontend'
            };
        }

        const boostData = {
            provider: 'forge',
            cloudId: cloudId,
            actor: actor,
            integrationToken: 'default-token',
            recipients: [{ accountId: recipientAccountId, displayName: recipientName }],
            tempBoosts: 1,
            message: message || '🚀 Boost sent!',
            context: { triggerType: 'manual_boost' },
        };

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const resp = await global.fetch('https://53758b93165a.ngrok-free.app/integrations/jira/boosts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Integration-Token': 'default-token' },
            body: JSON.stringify(boostData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
            const txt = await resp.text();
            return { success: false, error: `Backend error: ${resp.status} - ${txt}` };
        }
        const data = await resp.json();
        return { success: true, message: `Boost sent to ${recipientName}!`, data };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out - backend may be slow or unavailable' };
        }
        return { success: false, error: error.message };
    }
});

// Fetch "Your Boost Stats" for the current Jira user
resolver.define('getUserStats', async (req) => {
    try {
        const { cloudId, accountId } = req.payload || {};
        if (!cloudId || !accountId) {
            return { success: false, error: 'Missing required fields: cloudId and accountId' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const url = `https://53758b93165a.ngrok-free.app/integrations/jira/user-stats?cloudId=${encodeURIComponent(cloudId)}&accountId=${encodeURIComponent(accountId)}`;
        const resp = await global.fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'X-Integration-Token': 'default-token' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
            const txt = await resp.text();
            return { success: false, error: `Backend error: ${resp.status} - ${txt}` };
        }
        const data = await resp.json();
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Request timed out' };
        }
        return { success: false, error: error.message };
    }
});

// Handle app installation event
export async function handleInstalled(event, context) {
    try {
        console.log('🎉 App installed! Starting user sync...', {
            cloudId: context.cloudId,
            installationId: context.installation?.id
        });

        // Get cloudId from context
        const cloudId = context.cloudId;
        if (!cloudId) {
            console.error('❌ No cloudId found in context');
            return { success: false, error: 'No cloudId found' };
        }

        // Send installation data to backend
        const installationData = {
            cloudId: cloudId,
            baseUrl: context.baseUrl,
            installationTime: new Date().toISOString(),
            installingUser: context.installingUser,
            account: context.account,
            installation: context.installation,
            context: context
        };

        const response = await global.fetch('https://53758b93165a.ngrok-free.app/integrations/jira/installation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Integration-Token': 'default-token'
            },
            body: JSON.stringify(installationData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Installation data sent to backend:', result);
            return { success: true, data: result };
        } else {
            const errorText = await response.text();
            console.error('❌ Backend installation error:', response.status, errorText);
            return { success: false, error: `Backend error: ${response.status} - ${errorText}` };
        }
    } catch (error) {
        console.error('❌ Error handling installation:', error);
        return { success: false, error: error.message };
    }
}

export const handler = resolver.getDefinitions();

