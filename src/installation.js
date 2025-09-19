// Installation webhook handler - gets called when app is installed
export const handler = async (event, context) => {
  console.log('🚀 REWARDIFY APP INSTALLED!');
  console.log('📝 Installation event:', JSON.stringify(event, null, 2));
  console.log('🔍 Installation context:', JSON.stringify(context, null, 2));

  try {
    const { cloudId, baseUrl } = context;

    console.log('🌐 Cloud ID:', cloudId);
    console.log('🔗 Base URL:', baseUrl);
    console.log('👤 Installing user:', event.user);
    console.log('🏢 Account info:', event.account);
    console.log('📋 Installation details:', event.installation);

    // Fetch all users from Jira workspace
    const users = await fetchJiraUsers(cloudId, baseUrl);
    console.log('👥 Fetched users from Jira workspace:', users.length, 'users found');

    // Send installation data to Rewardify backend with users
    await sendInstallationDataToBackend(cloudId, baseUrl, event, context, users);

    console.log('✅ Installation data logged successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Installation error:', error);
    return { success: false, error: error.message };
  }
};

// Fetch all users from Jira workspace using Forge API
async function fetchJiraUsers(cloudId, baseUrl) {
  try {
    console.log('🔍 Fetching users from Jira workspace...');

    // For installation webhook, we can't directly call the resolver
    // So we'll use a mock approach for now, but log that we need to implement this
    console.log('⚠️ Note: User fetching during installation requires proper Forge API setup');
    console.log('🌐 Cloud ID:', cloudId);
    console.log('🔗 Base URL:', baseUrl);

    // Mock users for demonstration - in production, this would be fetched via resolver
    const mockUsers = [
      {
        accountId: 'test-user-1',
        displayName: 'Test User 1',
        emailAddress: 'test1@example.com',
        active: true,
        accountType: 'atlassian'
      },
      {
        accountId: 'test-user-2',
        displayName: 'Test User 2',
        emailAddress: 'test2@example.com',
        active: true,
        accountType: 'atlassian'
      },
      {
        accountId: 'test-user-3',
        displayName: 'Test User 3',
        emailAddress: 'test3@example.com',
        active: true,
        accountType: 'atlassian'
      }
    ];

    console.log('👥 Mock users data (for demonstration):', JSON.stringify(mockUsers, null, 2));
    console.log('💡 To get real users, call the getJiraUsers resolver from the frontend');

    return mockUsers;
  } catch (error) {
    console.error('❌ Error fetching Jira users:', error);
    return [];
  }
}

// Send installation data to Rewardify backend
async function sendInstallationDataToBackend(cloudId, baseUrl, event, context, users = []) {
  try {
    console.log('🔄 Sending installation data to backend...');

    const installationData = {
      cloudId: cloudId,
      baseUrl: baseUrl,
      installationTime: new Date().toISOString(),
      installingUser: {
        accountId: event.user?.accountId,
        displayName: event.user?.displayName,
        emailAddress: event.user?.emailAddress
      },
      account: {
        id: event.account?.id,
        name: event.account?.name,
        type: event.account?.type
      },
      installation: {
        id: event.installation?.id,
        type: event.installation?.type,
        permissions: event.installation?.permissions
      },
      context: {
        cloudId: context.cloudId,
        baseUrl: context.baseUrl,
        environment: context.environment
      },
      // Add users data from Jira workspace
      workspaceUsers: {
        totalCount: users.length,
        users: users,
        fetchedAt: new Date().toISOString()
      }
    };

    console.log('📤 Installation data to send:', JSON.stringify(installationData, null, 2));

    const response = await global.fetch('https://9301f0ad7d4c.ngrok-free.app/integrations/jira/installation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Token': 'default-token'
      },
      body: JSON.stringify(installationData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Installation data sent successfully:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to send installation data:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error sending installation data:', error);
  }
}