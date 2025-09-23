import React, { useState, useEffect } from 'react';
import ForgeReconciler, {
  Text,
  Button,
  LoadingButton,
  Textfield,
  Heading,
  Spinner,
  Stack,
  Box,
  Icon,
  SectionMessage,
  Lozenge,
  xcss,
} from '@forge/react';
import { invoke, requestJira } from '@forge/bridge';

// Beautiful custom styles
const cardStyle = xcss({
  backgroundColor: 'color.background.neutral',
  borderRadius: 'border.radius.200',
  padding: 'space.300',
  border: '1px solid',
  borderColor: 'color.border',
  boxShadow: 'elevation.shadow.raised',
});

const gradientHeader = xcss({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 'border.radius.200',
  padding: 'space.400',
  color: 'color.text.inverse',
  textAlign: 'center',
});

const statCard = xcss({
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 100%)',
  borderRadius: 'border.radius.100',
  padding: 'space.200',
  border: '1px solid',
  borderColor: 'color.border.subtle',
  textAlign: 'center',
  minWidth: '120px',
  boxShadow: 'elevation.shadow.raised',
});

// Simple custom badge component (avoid internal Badge)
const badgeContainer = xcss({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '44px',
  height: '44px',
  paddingInline: 'space.250',
  borderRadius: 'border.radius.1000',
  fontWeight: 'font.weight.bold',
});

function StatBadge({ value, appearance = 'neutral' }) {
  // Colorful gradients per appearance
  let gradient = 'linear-gradient(135deg, #8e9eab 0%, #eef2f3 100%)';
  if (appearance === 'added')
    gradient = 'linear-gradient(135deg, #00c853 0%, #b2ff59 100%)';
  if (appearance === 'removed')
    gradient = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
  if (appearance === 'inprogress')
    gradient = 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)';

  const style = xcss({
    background: gradient,
    color: 'color.text.inverse',
    boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
    border: '1px solid',
    borderColor: 'color.border.inverse',
  });
  return (
    <Box xcss={[badgeContainer, style]}>
      <Text size='large'>{String(value ?? 0)}</Text>
    </Box>
  );
}

const boostButton = xcss({
  background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
  border: 'none',
  borderRadius: 'border.radius.200',
  color: 'color.text.inverse',
  fontWeight: 'font.weight.semibold',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 'elevation.shadow.overlay',
  },
});

const featureCard = xcss({
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius.200',
  padding: 'space.300',
  border: '1px solid',
  borderColor: 'color.border.subtle',
  marginBottom: 'space.200',
});

const vertical20 = xcss({ marginBlock: 'space.250' });
const horizontal20 = xcss({ marginInline: 'space.250' });

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

  // Cache for boost data to avoid repeated API calls
  const [boostDataCache, setBoostDataCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const CACHE_DURATION = 30000; // 30 seconds cache

  // Load boost data on component mount
  useEffect(() => {
    loadBoostData();
  }, []);

  const loadBoostData = async (forceRefresh = false) => {
    try {
      // Check cache first unless force refresh
      const now = Date.now();
      if (
        !forceRefresh &&
        boostDataCache &&
        cacheTimestamp &&
        now - cacheTimestamp < CACHE_DURATION
      ) {
        setBoostData(boostDataCache);
        setMessage('✅ Boost data loaded from cache');
        return;
      }

      setLoading(true);
      // Get current Jira user and cloudId
      const meResp = await requestJira('/rest/api/3/myself', {
        headers: { Accept: 'application/json' },
      });
      if (!meResp.ok) {
        const txt = await meResp.text();
        throw new Error(`Jira API error (myself): ${meResp.status} - ${txt}`);
      }
      const me = await meResp.json();
      const accountId = me.accountId;
      let cloudId = 'unknown-cloud';
      if (typeof me.self === 'string') {
        const m = me.self.match(/\/ex\/jira\/([^/]+)\//);
        if (m) cloudId = m[1];
      }

      const resp = await invoke('getBoostData', { cloudId, accountId });
      const mapped = resp?.data || resp; // resolver returns { success, data }
      console.log('📊 Mapped boost stats:', mapped);
      setBoostData(mapped);
      setBoostDataCache(mapped);
      setCacheTimestamp(now);
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

  // Removed loadUserStats; relying on loadBoostData only

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

  const fetchAllAtlassianUsers = async (maxUsers = 50) => {
    const pageSize = 50; // Smaller page size for faster loading
    let startAt = 0;
    const realUsers = [];
    const maxPages = Math.ceil(maxUsers / pageSize); // Limit total pages

    for (let page = 0; page < maxPages; page++) {
      try {
        // Use users/search, NOT /users
        const res = await requestJira(
          `/rest/api/3/users/search?accountType=atlassian&startAt=${startAt}&maxResults=${pageSize}`,
          { headers: { Accept: 'application/json' } }
        );

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Jira API error: ${res.status} - ${txt}`);
        }

        const pageData = await res.json(); // array
        if (!Array.isArray(pageData) || pageData.length === 0) break;

        // filter to humans (guard in case server ignores accountType param)
        const humans = pageData.filter(
          (u) => u.accountType === 'atlassian' && u.active !== false
        );
        realUsers.push(...humans);

        // Stop if we have enough users
        if (realUsers.length >= maxUsers) {
          realUsers.splice(maxUsers); // Trim to maxUsers
          break;
        }

        // next page
        startAt += pageData.length;
      } catch (error) {
        console.warn(`Error fetching page ${page + 1}:`, error);
        // Continue with what we have rather than failing completely
        break;
      }
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
  console.log('Rendering App with boostData:', boostData);
  return (
    <Stack space='space.400'>
      {/* Beautiful Header */}
      <Box xcss={gradientHeader}>
        {/* <Stack space='space.200' alignInline='center'>
          <Heading size='large'>🚀 Rewardify Boosts</Heading>
          <Text size='medium' color='color.text.inverse'>
            Give and track boosts just like Slack! Spread positivity and
            recognize great work.
          </Text>
        </Stack> */}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box xcss={cardStyle}>
          <Stack space='space.200' alignInline='center'>
            <Spinner size='large' />
            <Text>Loading boost data…</Text>
          </Stack>
        </Box>
      )}

      {/* Status Messages */}
      {message && (
        <SectionMessage
          appearance={
            message.includes('✅')
              ? 'success'
              : message.includes('❌')
              ? 'error'
              : 'info'
          }
          title={
            message.includes('✅')
              ? 'Success'
              : message.includes('❌')
              ? 'Error'
              : 'Info'
          }
        >
          <Text>{message}</Text>
        </SectionMessage>
      )}

      {/* Boost Stats Cards */}
      <Box xcss={cardStyle}>
        <Heading size='medium' marginBottom='space.300'>
          <Icon name='chart-line' size='medium' />
          <Text xcss={horizontal20}>Your Boost Stats</Text>
        </Heading>
        <Stack space='space.200' direction='horizontal' alignBlock='center'>
          <Box xcss={statCard}>
            <Stack space='space.100' alignInline='center'>
              <Icon name='trophy' size='large' />
              <Text size='small' color='color.text.subtle'>
                Received
              </Text>
              <StatBadge
                appearance='added'
                value={boostData?.totalBoostsReceived ?? 0}
              />
            </Stack>
          </Box>

          <Box xcss={statCard}>
            <Stack space='space.100' alignInline='center'>
              <Icon name='gift' size='large' />
              <Text size='small' color='color.text.subtle'>
                Available
              </Text>
              <StatBadge
                appearance='inprogress'
                value={boostData?.tempBoosts ?? 0}
              />
            </Stack>
          </Box>

          <Box xcss={statCard}>
            <Stack space='space.100' alignInline='center'>
              <Icon name='send' size='large' />
              <Text size='small' color='color.text.subtle'>
                Given Today
              </Text>
              <StatBadge
                appearance='removed'
                value={boostData?.boostsGivenToday ?? 0}
              />
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Give Boost Section */}
      {/* <Box xcss={cardStyle}>
        <Heading size='medium' marginBottom='space.300'>
          <Icon name='add-circle' size='medium' />
          <Text xcss={horizontal20}>Give a Boost</Text>
        </Heading>

        <Stack space='space.300'>
          <Textfield
            label='Recipient Name'
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Enter recipient's name"
            isRequired
          />
          <Textfield
            label='Boost Message (optional)'
            value={boostMessage}
            onChange={(e) => setBoostMessage(e.target.value)}
            placeholder='🚀 Great work! You earned a boost!'
            isMultiline
            rows={3}
          />
          <LoadingButton
            appearance='primary'
            onClick={handleGiveBoost}
            isLoading={givingBoost}
            xcss={boostButton}
          >
            <Icon name='send' size='small' />
            <Text xcss={horizontal20}>🚀 Give Boost</Text>
          </LoadingButton>
        </Stack>
      </Box> */}

      {/* How to Earn Boosts */}
      {/* <Box xcss={featureCard}>
        <Heading size='small' marginBottom='space.200'>
          <Icon name='lightbulb' size='small' />
          <Text xcss={horizontal20}>How to Earn Boosts</Text>
        </Heading>
        <Stack space='space.150'>
          <Box>
            <Stack space='space.100' direction='horizontal' alignBlock='center'>
              <Lozenge appearance='success' text='✓' />
              <Text>Complete issues (mark as Done/Resolved)</Text>
            </Stack>
          </Box>
          <Box>
            <Stack space='space.100' direction='horizontal' alignBlock='center'>
              <Lozenge appearance='success' text='✓' />
              <Text>Add positive comments with 🚀 or #boost</Text>
            </Stack>
          </Box>
          <Box>
            <Stack space='space.100' direction='horizontal' alignBlock='center'>
              <Lozenge appearance='success' text='✓' />
              <Text>Help teammates and contribute to discussions</Text>
            </Stack>
          </Box>
        </Stack>
      </Box> */}

      {/* User Management Section */}
      <Box xcss={cardStyle}>
        {/* <Heading size='medium' marginBottom='space.300'>
          <Icon name='people' size='medium' />
          <Text xcss={horizontal20}>User Management</Text>
        </Heading> */}

        <Stack space='space.200'>
          {/* <Button
            appearance='secondary'
            onClick={fetchJiraUsersDirectly}
            isFullWidth
          >
            <Icon name='refresh' size='small' />
            <Text xcss={horizontal20}>Fetch Jira Users</Text>
          </Button> */}

          <Button appearance='primary' onClick={syncUsersToBackend} isFullWidth>
            <Icon name='upload' size='small' />
            <Text xcss={horizontal20}>Sync Users</Text>
          </Button>
        </Stack>

        {/* User List Preview */}
        {users.length > 0 && (
          <Box marginTop='space.300'>
            <Heading size='small' marginBottom='space.200'>
              <Icon name='user' size='small' />
              <Text xcss={horizontal20}>Recent Users ({users.length})</Text>
            </Heading>
            <Stack space='space.100'>
              {users.slice(0, 5).map((u) => (
                <Box key={u.accountId} xcss={featureCard}>
                  <Stack
                    space='space.100'
                    direction='horizontal'
                    alignBlock='center'
                  >
                    <Icon name='person' size='small' />
                    <Text size='small'>{u.displayName}</Text>
                    <Lozenge
                      appearance='neutral'
                      text={u.accountId.slice(0, 8)}
                    />
                  </Stack>
                </Box>
              ))}
              {users.length > 5 && (
                <Text size='small' color='color.text.subtle'>
                  …and {users.length - 5} more users
                </Text>
              )}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Refresh Button */}
      <Box xcss={vertical20}>
        <Button
          appearance='primary'
          onClick={() => loadBoostData(true)}
          isFullWidth
        >
          <Icon name='refresh' size='small' />
          <Text xcss={horizontal20}>🔄 Refresh Boost Data</Text>
        </Button>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(<App />);
