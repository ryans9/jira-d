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
    
    // Send installation data to Rewardify backend
    await sendInstallationDataToBackend(cloudId, baseUrl, event, context);
    
    console.log('✅ Installation data logged successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Installation error:', error);
    return { success: false, error: error.message };
  }
};

// Send installation data to Rewardify backend
async function sendInstallationDataToBackend(cloudId, baseUrl, event, context) {
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