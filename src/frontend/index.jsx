import React, { useEffect, useState } from 'react';
import ForgeReconciler, { 
  Text, 
  Button, 
  TextField, 
  Heading, 
  Divider, 
  Spinner,
  InlineMessage,
  Badge,
  Stack,
  Box
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [boostData, setBoostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [givingBoost, setGivingBoost] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [boostMessage, setBoostMessage] = useState('');
  const [message, setMessage] = useState('');

  // Load boost data when component mounts
  useEffect(() => {
    loadBoostData();
  }, []);

  const loadBoostData = async () => {
    try {
      setLoading(true);
      const data = await invoke('getBoostData');
      setBoostData(data.data);
    } catch (error) {
      console.error('Error loading boost data:', error);
      setMessage('Error loading boost data');
    } finally {
      setLoading(false);
    }
  };

  const handleGiveBoost = async () => {
    if (!recipientName.trim()) {
      setMessage('Please enter a recipient name');
      return;
    }

    try {
      setGivingBoost(true);
      setMessage('');
      
      const boostPayload = {
        recipientAccountId: 'temp-id', // In real implementation, you'd get this from Jira
        recipientName: recipientName.trim(),
        message: boostMessage.trim() || `🚀 You earned a boost!`
      };
      
      console.log('🚀 Frontend: Sending boost with payload:', boostPayload);
      
      const result = await invoke('giveBoost', boostPayload);
      
      console.log('📥 Frontend: Received result:', result);

      if (result.success) {
        setMessage('✅ Boost sent successfully!');
        setRecipientName('');
        setBoostMessage('');
        // Reload boost data
        await loadBoostData();
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error giving boost:', error);
      setMessage('❌ Error sending boost');
    } finally {
      setGivingBoost(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Spinner />
        <Text>Loading boost data...</Text>
      </Box>
    );
  }

  return (
    <Stack space="medium">
      {/* Header */}
      <Box>
        <Heading size="medium">🚀 Rewardify Boosts</Heading>
        <Text>Give and track boosts just like Slack!</Text>
      </Box>

      <Divider />

      {/* Boost Stats */}
      <Box>
        <Heading size="small">Your Boost Stats</Heading>
        <Stack space="small">
          <Box>
            <Text>Total Boosts Received: </Text>
            <Badge appearance="added" text={boostData?.totalBoostsReceived || 0} />
          </Box>
          <Box>
            <Text>Available Boosts: </Text>
            <Badge appearance="inprogress" text={boostData?.tempBoosts || 0} />
          </Box>
          <Box>
            <Text>Boosts Given Today: </Text>
            <Badge appearance="removed" text={boostData?.boostsGivenToday || 0} />
          </Box>
        </Stack>
      </Box>

      <Divider />

      {/* Give Boost Section */}
      <Box>
        <Heading size="small">Give a Boost</Heading>
        <Stack space="small">
          <TextField
            label="Recipient Name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Enter recipient's name"
          />
          <TextField
            label="Boost Message (optional)"
            value={boostMessage}
            onChange={(e) => setBoostMessage(e.target.value)}
            placeholder="🚀 Great work! You earned a boost!"
          />
          <Button
            appearance="primary"
            onClick={handleGiveBoost}
            loading={givingBoost}
            text={givingBoost ? "Sending Boost..." : "🚀 Give Boost"}
          />
        </Stack>
      </Box>

      {/* How to Earn Boosts */}
      <Box>
        <Heading size="small">How to Earn Boosts</Heading>
        <Stack space="small">
          <Text>• Complete issues (mark as Done/Resolved)</Text>
          <Text>• Add positive comments with 🚀 or #boost</Text>
          <Text>• Help teammates and contribute to discussions</Text>
        </Stack>
      </Box>

      {/* Status Message */}
      {message && (
        <InlineMessage
          appearance={message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}
          title={message}
        />
      )}

      {/* Refresh Button */}
      <Button
        appearance="subtle"
        onClick={loadBoostData}
        text="🔄 Refresh Stats"
      />
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
