import React, { useState } from 'react';
import ForgeReconciler, {
  Text,
  Button,
  LoadingButton,
  Textfield,
  Heading,
  Spinner,
  Badge,
  Stack,
  Box,
  // SectionMessage, // use this if you want a styled banner for `message`
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

// 20px vertical margin using tokens (8px base * 2.5 = 20px)
const vertical20 = xcss({ marginBlock: 'space.250' });

const App = () => {
  const [boostData, setBoostData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [givingBoost, setGivingBoost] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [boostMessage, setBoostMessage] = useState('');
  const [message, setMessage] = useState('');

  const loadBoostData = async () => {
    try {
      setLoading(true);
      const data = await invoke('getBoostData');
      setBoostData(data.data);
      setMessage('✅ Boost data refreshed');
    } catch (error) {
      console.error('❌ Error loading boost data:', error);
      setMessage('❌ Error loading boost data');
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
        recipientAccountId: 'temp-id', // TODO: map from Jira
        recipientName: recipientName.trim(),
        message: boostMessage.trim() || '🚀 You earned a boost!',
      };

      const result = await invoke('giveBoost', boostPayload);
      if (result.success) {
        setMessage('✅ Boost sent successfully!');
        setRecipientName('');
        setBoostMessage('');
        setBoostData((prev) => ({
          ...prev,
          boostsGivenToday: (prev?.boostsGivenToday || 0) + 1,
          tempBoosts: Math.max((prev?.tempBoosts || 0) - 1, 0),
        }));
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

  const fetchJiraUsers = async () => {
    try {
      setMessage('👥 Fetching Jira users...');
      const result = await invoke('getJiraUsers');

      if (result.success) {
        const { totalCount, users, note = '' } = result.data;
        setMessage(`✅ Found ${totalCount} users in Jira workspace! ${note}`);
        users.forEach((user, i) => {
          console.log(`👤 User ${i + 1}:`, {
            name: user.displayName,
            email: user.emailAddress,
            accountId: user.accountId,
            active: user.active,
          });
        });
      } else {
        setMessage(`❌ Error fetching users: ${result.error}`);
      }
    } catch (error) {
      console.error('Error fetching Jira users:', error);
      setMessage('❌ Error fetching users');
    }
  };

  return (
    <Stack space='space.300'>
      {/* Header */}
      <Box>
        <Heading size='medium'>🚀 Rewardify Boosts</Heading>
        <Text>Give and track boosts just like Slack!</Text>
      </Box>

      {/* Loading indicator */}
      {loading && (
        <Box>
          <Spinner />
          <Text>Loading boost data…</Text>
        </Box>
      )}

      {/* Status (swap to <SectionMessage appearance="success|error|info" title={message}/> if desired) */}
      {message && (
        <Box>
          <Text>{message}</Text>
        </Box>
      )}

      {/* Boost Stats */}
      <Box>
        <Heading size='small'>Your Boost Stats</Heading>
        <Stack space='space.200'>
          <Box>
            <Text>Total Boosts Received: </Text>
            <Badge
              appearance='added'
              text={boostData?.totalBoostsReceived || 0}
            />
          </Box>
          <Box>
            <Text>Available Boosts: </Text>
            <Badge appearance='inprogress' text={boostData?.tempBoosts || 0} />
          </Box>
          <Box>
            <Text>Boosts Given Today: </Text>
            <Badge
              appearance='removed'
              text={boostData?.boostsGivenToday || 0}
            />
          </Box>
        </Stack>
      </Box>

      {/* Give Boost */}
      <Box>
        <Heading size='small'>Give a Boost</Heading>
        <Stack space='space.200'>
          <Textfield
            label='Recipient Name'
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)} // per docs: event.target.value
            placeholder="Enter recipient's name"
          />
          <Textfield
            label='Boost Message (optional)'
            value={boostMessage}
            onChange={(e) => setBoostMessage(e.target.value)}
            placeholder='🚀 Great work! You earned a boost!'
          />
          <LoadingButton
            appearance='primary'
            onClick={handleGiveBoost}
            isLoading={givingBoost}
          >
            🚀 Give Boost
          </LoadingButton>
        </Stack>
      </Box>

      {/* How to Earn Boosts */}
      <Box>
        <Heading size='small'>How to Earn Boosts</Heading>
        <Stack space='space.200'>
          <Text>• Complete issues (mark as Done/Resolved)</Text>
          <Text>• Add positive comments with 🚀 or #boost</Text>
          <Text>• Help teammates and contribute to discussions</Text>
        </Stack>
      </Box>

      {/* EXACT ~20px (space.250) margin above & below */}
      <Box xcss={vertical20}>
        <Button appearance='primary' onClick={fetchJiraUsers}>
          👥 Fetch Jira Users
        </Button>
      </Box>

      {/* Refresh */}
      <Button appearance='primary' onClick={loadBoostData}>
        🔄 Refresh Boost Data
      </Button>
    </Stack>
  );
};

ForgeReconciler.render(<App />);
