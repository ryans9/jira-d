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

export const handler = resolver.getDefinitions();