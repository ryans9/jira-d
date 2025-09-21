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
  xcss,
} from '@forge/react';
import { invoke, requestJira } from '@forge/bridge';

const vertical20 = xcss({ marginBlock: 'space.250' }); // ≈20px

const App = () => {
  const [boostData, setBoostData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [givingBoost, setGivingBoost] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [boostMessage, setBoostMessage] = useState('');
  const [message, setMessage] = useState('');
  const [usersMeta, setUsersMeta] = useState({
    totalCount: 0,
    pages: 0,
    page: 0,
    lastSyncAt: null,
  });
  const [users, setUsers] = useState([]);

  const loadBoostData = async () => {
    try {
      setLoading(true);
      const data = await invoke('getBoostData');
      setBoostData(data.data);
      setMessage('✅ Boost data refreshed');
    } catch (e) {
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
      const res = await invoke('giveBoost', {
        recipientAccountId: 'temp-id',
        recipientName: recipientName.trim(),
        message: boostMessage.trim() || '🚀 You earned a boost!',
      });
      if (res.success) {
        setMessage(res.message || '✅ Boost sent!');
        setRecipientName('');
        setBoostMessage('');
        setBoostData((prev) => ({
          ...prev,
          boostsGivenToday: (prev?.boostsGivenToday || 0) + 1,
          tempBoosts: Math.max((prev?.tempBoosts || 0) - 1, 0),
        }));
      } else {
        setMessage(`❌ ${res.error}`);
      }
    } catch (e) {
      setMessage('❌ Error sending boost');
    } finally {
      setGivingBoost(false);
    }
  };

  // const WEBTRIGGER_URL =
  //   'https://148f729d-eda9-4539-9c68-9471f592a87f.hello.atlassian-dev.net/x1/o7BbgVfVsH04-eFtGP2w2zKhNDg';

  // async function fetchJiraUsers(page = 0) {
  //   setMessage('👥 Fetching Jira users...');
  //   const resp = await fetch(`${WEBTRIGGER_URL}?page=${page}`);
  //   const json = await resp.json();
  //   console.log('Fetched users response:', json);
  //   if (json.success) {
  //     const { users, totalCount, pages, page, lastSyncAt } = json.data;
  //     // ...update state with users & meta...
  //   } else {
  //     setMessage(`❌ ${json.error || 'Error fetching users'}`);
  //   }
  // }

  const fetchJiraUsersDirectly = async () => {
    try {
      setMessage('🔄 Fetching Jira users directly from API...');
      setLoading(true);

      // Call Jira API directly from frontend - filter for actual users only
      const response = await requestJira(
        '/rest/api/3/users?accountType=atlassian',
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (response.ok) {
        const users = await response.json();
        console.log(`📊 Found ${users.length} actual users from Jira API:`);

        // Print each user to console
        users.forEach((user, index) => {
          console.log(`User ${index + 1}:`, {
            accountId: user.accountId,
            displayName: user.displayName,
            emailAddress: user.emailAddress,
            active: user.active,
            accountType: user.accountType,
          });
        });

        setUsers(users);
        setUsersMeta({
          totalCount: users.length,
          pages: 1,
          page: 0,
          lastSyncAt: new Date().toISOString(),
        });
        setMessage(
          `✅ Fetched ${users.length} actual users directly from Jira API`
        );
      } else {
        const errorText = await response.text();
        console.error('❌ Jira API error:', response.status, errorText);
        setMessage(`❌ Jira API error: ${response.status} - ${errorText}`);
      }
    } catch (e) {
      console.error('❌ Error fetching Jira users:', e);
      setMessage(`❌ Error fetching users: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAtlassianUsers = async () => {
    const pageSize = 100; // Jira supports paging; keep it reasonable to avoid rate limits
    let startAt = 0;
    const realUsers = [];

    for (;;) {
      // Use users/search, NOT /users
      const res = await requestJira(
        `/rest/api/3/users/search?accountType=atlassian&startAt=${startAt}&maxResults=${pageSize}`,
        { headers: { Accept: 'application/json' } }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Jira API error: ${res.status} - ${txt}`);
      }

      const page = await res.json(); // array
      if (!Array.isArray(page) || page.length === 0) break;

      // filter to humans (guard in case server ignores accountType param)
      const humans = page.filter(
        (u) => u.accountType === 'atlassian' && u.active !== false
      );
      realUsers.push(...humans);

      // next page
      startAt += page.length;
    }

    return realUsers;
  };

  const syncUsersToBackend = async () => {
    try {
      setMessage('🔄 Fetching users (humans only) from Jira…');
      setLoading(true);

      const users = await fetchAllAtlassianUsers();
      console.log(`👥 Found ${users.length} atlassian users`, users);

      // optional: enrich emails (GDPR/privacy often hides emailAddress)
      // If you really need emails, you may need to call /rest/api/3/user?accountId=... or dedicated email endpoints per user.
      // Beware of rate limits; batch or cache if you add this.

      setMessage(`✅ Loaded ${users.length} users. Syncing to backend…`);

      const syncResult = await invoke('syncUsersToBackend', { users });
      if (syncResult?.success) {
        setMessage(`✅ Successfully synced ${users.length} users to backend!`);
        console.log('✅ Backend sync result:', syncResult);
      } else {
        setMessage(
          `❌ Backend sync failed: ${syncResult?.error || 'unknown error'}`
        );
      }
    } catch (e) {
      console.error('❌ Error syncing users to backend:', e);
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack space='space.300'>
      <Box>
        <Heading size='medium'>🚀 Rewardify Boosts</Heading>
        <Text>Give and track boosts just like Slack!</Text>
      </Box>

      {loading && (
        <Box>
          <Spinner />
          <Text>Loading boost data…</Text>
        </Box>
      )}

      {message && (
        <Box>
          <Text>{message}</Text>
        </Box>
      )}

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

      <Box>
        <Heading size='small'>Give a Boost</Heading>
        <Stack space='space.200'>
          <Textfield
            label='Recipient Name'
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
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

      <Box>
        <Heading size='small'>How to Earn Boosts</Heading>
        <Stack space='space.200'>
          <Text>• Complete issues (mark as Done/Resolved)</Text>
          <Text>• Add positive comments with 🚀 or #boost</Text>
          <Text>• Help teammates and contribute to discussions</Text>
        </Stack>
      </Box>

      {/* EXACT ~20px margin above & below */}
      <Box xcss={vertical20}>
        <Stack space='space.100'>
          {/* <Button appearance='primary' onClick={() => fetchJiraUsers(0)}>
            👥 Fetch Jira Users
          </Button> */}
          <Button appearance='secondary' onClick={fetchJiraUsersDirectly}>
            🔄 Fetch Jira Users Directly (from API)
          </Button>
          <Button appearance='primary' onClick={syncUsersToBackend}>
            📤 Sync All Users to Backend
          </Button>
        </Stack>
      </Box>

      {/* Simple pager (only shows when there’s > 1 page) */}
      {usersMeta.pages > 1 && (
        <Stack space='space.100'>
          <Text>
            Page {usersMeta.page + 1} / {usersMeta.pages} · Last sync:{' '}
            {usersMeta.lastSyncAt || 'unknown'}
          </Text>
          <Stack space='space.100'>
            {/* <Button
              onClick={() => fetchJiraUsers(Math.max(0, usersMeta.page - 1))}
            >
              ◀ Prev
            </Button>
            <Button
              onClick={() =>
                fetchJiraUsers(
                  Math.min(usersMeta.pages - 1, usersMeta.page + 1)
                )
              }
            >
              Next ▶
            </Button> */}
          </Stack>
        </Stack>
      )}

      {/* Basic list preview */}
      {users.length > 0 && (
        <Box>
          <Heading size='small'>Users (this page)</Heading>
          <Stack space='space.100'>
            {users.slice(0, 10).map((u) => (
              <Text key={u.accountId}>
                • {u.displayName} ({u.accountId})
              </Text>
            ))}
            {users.length > 10 && (
              <Text>…and {users.length - 10} more on this page</Text>
            )}
          </Stack>
        </Box>
      )}

      <Button appearance='primary' onClick={loadBoostData}>
        🔄 Refresh Boost Data
      </Button>
    </Stack>
  );
};

ForgeReconciler.render(<App />);
