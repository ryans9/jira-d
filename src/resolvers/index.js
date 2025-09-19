import Resolver from '@forge/resolver';

const resolver = new Resolver();

// Get boost data for the current user
resolver.define('getBoostData', async (req) => {
  try {
    console.log('📊 Getting boost data for user');
    console.log('🔍 Full request object:', JSON.stringify(req, null, 2));
    console.log('🔍 Request context:', JSON.stringify(req.context, null, 2));
    console.log('🔍 Request payload:', JSON.stringify(req.payload, null, 2));

    // Log all available context data
    if (req.context) {
      console.log('📝 Extension context:', JSON.stringify(req.context.extension, null, 2));
      console.log('👤 User context:', JSON.stringify(req.context.user, null, 2));
      console.log('🌐 Cloud context:', JSON.stringify(req.context.cloud, null, 2));
      console.log('🏢 Account context:', JSON.stringify(req.context.account, null, 2));
    }

    // For now, return mock data to test if the panel loads
    // TODO: Enable real API calls once we confirm the panel works
    return {
      success: true,
      data: {
        totalBoostsReceived: 5,
        tempBoosts: 10,
        boostsGivenToday: 2
      }
    };
  } catch (error) {
    console.error('❌ Error getting boost data:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Give boost to someone - REAL API VERSION
resolver.define('giveBoost', async (req) => {
  try {
    console.log('🚀 Giving boost via resolver');
    console.log('🔍 Full request object:', JSON.stringify(req, null, 2));
    console.log('🔍 Request context:', JSON.stringify(req.context, null, 2));
    console.log('🔍 Request payload:', JSON.stringify(req.payload, null, 2));

    // Log all available context data
    if (req.context) {
      console.log('📝 Extension context:', JSON.stringify(req.context.extension, null, 2));
      console.log('👤 User context:', JSON.stringify(req.context.user, null, 2));
      console.log('🌐 Cloud context:', JSON.stringify(req.context.cloud, null, 2));
      console.log('🏢 Account context:', JSON.stringify(req.context.account, null, 2));
    }

    const { recipientAccountId, recipientName, message } = req.payload;
    console.log('📤 Boost payload:', { recipientAccountId, recipientName, message });

    // Test the API call to the backend
    const boostData = {
      provider: 'forge',
      cloudId: 'test-cloud-id',
      integrationToken: 'default-token',
      actor: {
        accountId: 'test-user-id',
        displayName: 'Test User',
        email: 'test@example.com'
      },
      recipients: [{
        accountId: recipientAccountId,
        displayName: recipientName,
        email: 'test@example.com'
      }],
      tempBoosts: 1,
      message: message || `🚀 Test User gave you a boost!`,
      context: {
        issueKey: 'KAN-6',
        projectKey: 'KAN',
        issueId: '10099',
        triggerType: 'manual_boost',
        issueSummary: 'Test Issue',
        issueUrl: 'https://rewardify-dev.atlassian.net/browse/KAN-6'
      }
    };

    console.log('📤 Sending boost data to backend:', JSON.stringify(boostData, null, 2));

    // Call the real backend API
    const response = await global.fetch('https://9301f0ad7d4c.ngrok-free.app/integrations/jira/boosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Token': 'default-token'
      },
      body: JSON.stringify(boostData)
    });

    console.log('📥 Backend response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Boost sent successfully:', result);
      return {
        success: true,
        message: `Boost sent to ${recipientName}!`,
        data: result
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Backend error:', response.status, errorText);
      return {
        success: false,
        error: `Backend error: ${response.status} - ${errorText}`
      };
    }
  } catch (error) {
    console.error('❌ Error giving boost:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Fetch all users from Jira workspace
resolver.define('getJiraUsers', async (req) => {
  try {
    console.log('👥 Fetching Jira users...');
    console.log('🔍 Request context:', JSON.stringify(req.context, null, 2));

    const cloudId = req.context.cloudId;
    console.log('🌐 Cloud ID:', cloudId);

    // Note: @forge/api is not available in resolver context
    // For now, we'll return mock data to demonstrate the functionality
    // In a real implementation, you would need to use a different approach
    // such as calling an external API or using a webhook

    const mockUsers = [
      {
        accountId: 'user-1',
        displayName: 'John Doe',
        emailAddress: 'john.doe@example.com',
        active: true,
        accountType: 'atlassian',
        avatarUrls: {
          '48x48': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JD-5.png',
          '24x24': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JD-3.png',
          '16x16': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JD-2.png',
          '32x32': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JD-4.png'
        }
      },
      {
        accountId: 'user-2',
        displayName: 'Jane Smith',
        emailAddress: 'jane.smith@example.com',
        active: true,
        accountType: 'atlassian',
        avatarUrls: {
          '48x48': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JS-5.png',
          '24x24': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JS-3.png',
          '16x16': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JS-2.png',
          '32x32': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/JS-4.png'
        }
      },
      {
        accountId: 'user-3',
        displayName: 'Bob Johnson',
        emailAddress: 'bob.johnson@example.com',
        active: true,
        accountType: 'atlassian',
        avatarUrls: {
          '48x48': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BJ-5.png',
          '24x24': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BJ-3.png',
          '16x16': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BJ-2.png',
          '32x32': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BJ-4.png'
        }
      }
    ];

    console.log('👥 Mock users data (resolver limitation):', JSON.stringify(mockUsers, null, 2));
    console.log('⚠️ Note: @forge/api is not available in resolver context');
    console.log('💡 To get real users, consider using a webhook or external API call');

    return {
      success: true,
      data: {
        users: mockUsers,
        totalCount: mockUsers.length,
        fetchedAt: new Date().toISOString(),
        note: 'This is mock data due to resolver limitations. Real implementation would require different approach.'
      }
    };
  } catch (error) {
    console.error('❌ Error fetching Jira users:', error);
    return {
      success: false,
      error: error.message,
      data: {
        users: [],
        totalCount: 0,
        error: error.message
      }
    };
  }
});

export const handler = resolver.getDefinitions();